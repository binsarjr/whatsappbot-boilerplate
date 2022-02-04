import {
    BaileysEventEmitter,
    Chat,
    ConnectionState,
    Contact,
    DEFAULT_CONNECTION_CONFIG,
    GroupMetadata,
    jidNormalizedUser,
    MessageUserReceipt,
    PresenceData,
    proto,
    toNumber,
    WAMessage
} from '@adiwajshing/baileys'
import type KeyedDB from '@adiwajshing/keyed-db'
import { Comparable } from '@adiwajshing/keyed-db/lib/Types'
import fs from 'fs'
import path from 'path'
import { Logger } from 'pino'

const updateMessageWithReceipt = (
    msg: WAMessage,
    receipt: MessageUserReceipt
) => {
    msg.userReceipt = msg.userReceipt || []
    const recp = msg.userReceipt.find((m) => m.userJid === receipt.userJid)
    if (recp) {
        Object.assign(recp, receipt)
    } else {
        msg.userReceipt.push(receipt)
    }
}
const waChatKey = (pin: boolean) => ({
    key: (c: Chat) =>
        (pin ? (c.pin ? '1' : '0') : '') +
        (c.archive ? '0' : '1') +
        (c.conversationTimestamp
            ? c.conversationTimestamp.toString(16).padStart(8, '0')
            : Date.now().toString(16).padStart(8, '0')) +
        c.id,
    compare: (k1: string, k2: string) => k2.localeCompare(k1)
})

const waMessageID = (m: WAMessage) => m.key.id || ''
function makeOrderedDictionary<T>(idGetter: (item: T) => string) {
    const array: T[] = []
    const dict: { [_: string]: T } = {}

    const get = (id: string) => dict[id]

    const update = (item: T) => {
        const id = idGetter(item)
        const idx = array.findIndex((i) => idGetter(i) === id)
        if (idx >= 0) {
            array[idx] = item
            dict[id] = item
        }

        return false
    }

    const upsert = (item: T, mode: 'append' | 'prepend') => {
        const id = idGetter(item)
        if (get(id)) {
            update(item)
        } else {
            if (mode === 'append') {
                array.push(item)
            } else {
                array.splice(0, 0, item)
            }

            dict[id] = item
        }
    }

    const remove = (item: T) => {
        const id = idGetter(item)
        const idx = array.findIndex((i) => idGetter(i) === id)
        if (idx >= 0) {
            array.splice(idx, 1)
            delete dict[id]
            return true
        }

        return false
    }

    return {
        array,
        get,
        upsert,
        update,
        remove,
        updateAssign: (id: string, update: Partial<T>) => {
            const item = get(id)
            if (item) {
                Object.assign(item, update)
                delete dict[id]
                dict[idGetter(item)] = item
                return true
            }

            return false
        },
        clear: () => {
            array.splice(0, array.length)
            Object.keys(dict).forEach((key) => {
                delete dict[key]
            })
        },
        filter: (contain: (item: T) => boolean) => {
            let i = 0
            while (i < array.length) {
                if (!contain(array[i])) {
                    delete dict[idGetter(array[i])]
                    array.splice(i, 1)
                } else {
                    i += 1
                }
            }
        },
        toJSON: () => array,
        fromJSON: (newItems: T[]) => {
            array.splice(0, array.length, ...newItems)
        }
    }
}
const makeMessagesDictionary = () => makeOrderedDictionary(waMessageID)

type StoreConfig = {
    chatKey?: Comparable<Chat, string>
    logger?: Logger
    filepath: string
}
export default class Store {
    filepath: string
    private logger: Logger
    private chatKey: Comparable<Chat, string>
    private KeyedDB = require('@adiwajshing/keyed-db').default as new (
        ...args: any[]
    ) => KeyedDB<Chat, string>
    chats: KeyedDB<Chat, string>
    messages: {
        [_: string]: ReturnType<typeof makeMessagesDictionary>
    } = {}
    contacts: { [_: string]: Contact } = {}
    groupMetadata: { [_: string]: GroupMetadata } = {}
    presences: {
        [id: string]: { [participant: string]: PresenceData }
    } = {}
    state: ConnectionState = { connection: 'close' }
    constructor(config: StoreConfig) {
        let { filepath, chatKey, logger } = config
        this.filepath = Store.sessionFile(filepath)
        this.logger =
            logger ||
            DEFAULT_CONNECTION_CONFIG.logger.child({ stream: 'in-mem-store' })
        this.chatKey = chatKey || waChatKey(true)
        this.chats = new this.KeyedDB(this.chatKey, (c: Chat) => c.id)
    }
    static sessionFile(filename: string, dir: string = '.sessions') {
        return path.join(dir, filename)
    }

    public mkdirIfNotExists(filepath: string) {
        if (!fs.existsSync(filepath)) {
            let dir = path.dirname(filepath)
            fs.mkdirSync(dir, { recursive: true })
        }
    }
    public delete() {
        return fs.existsSync(this.filepath) && fs.unlinkSync(this.filepath)
    }

    public saving(intervalMs: number = 10_000) {
        this.mkdirIfNotExists(this.filepath)
        this.readFromFile(this.filepath)
        setInterval(() => {
            this.writeToFile(this.filepath)
        }, intervalMs)
    }

    public async clearAll() {
        this.messages = {}
        this.contacts = {}
        this.chats.clear()
        this.groupMetadata = {}
        this.presences = {}
    }

    assertMessageList = (jid: string) => {
        if (!this.messages[jid]) {
            this.messages[jid] = makeMessagesDictionary()
        }

        return this.messages[jid]
    }

    contactsUpsert = (newContacts: Contact[]) => {
        const oldContacts = new Set(Object.keys(this.contacts))
        for (const contact of newContacts) {
            oldContacts.delete(contact.id)
            this.contacts[contact.id] = Object.assign(
                this.contacts[contact.id] || {},
                contact
            )
        }

        return oldContacts
    }

    /**
     * binds to a BaileysEventEmitter.
     * It listens to all events and constructs a state that you can query accurate data from.
     * Eg. can use the store to fetch chats, contacts, messages etc.
     * @param ev typically the event emitter from the socket connection
     */
    bind = (ev: BaileysEventEmitter) => {
        ev.on('connection.update', (update) => {
            Object.assign(this.state, update)
        })
        ev.on('chats.set', ({ chats: newChats, isLatest }) => {
            if (isLatest) {
                this.chats.clear()
            }

            const chatsAdded = this.chats.insertIfAbsent(...newChats).length
            this.logger.debug({ chatsAdded }, 'synced chats')
        })
        ev.on('contacts.set', ({ contacts: newContacts }) => {
            const oldContacts = this.contactsUpsert(newContacts)
            for (const jid of oldContacts) {
                delete this.contacts[jid]
            }

            this.logger.debug(
                { deletedContacts: oldContacts.size, newContacts },
                'synced contacts'
            )
        })
        ev.on('messages.set', ({ messages: newMessages, isLatest }) => {
            if (isLatest) {
                for (const id in this.messages) {
                    delete this.messages[id]
                }
            }

            for (const msg of newMessages) {
                const jid = msg.key.remoteJid!
                const list = this.assertMessageList(jid)
                list.upsert(msg, 'prepend')
            }

            this.logger.debug(
                { messages: newMessages.length },
                'synced messages'
            )
        })
        ev.on('contacts.update', (updates) => {
            for (const update of updates) {
                if (this.contacts[update.id!]) {
                    Object.assign(this.contacts[update.id!], update)
                } else {
                    this.logger.debug(
                        { update },
                        'got update for non-existant contact'
                    )
                }
            }
        })
        ev.on('chats.upsert', (newChats) => {
            this.chats.upsert(...newChats)
        })
        ev.on('chats.update', (updates) => {
            for (let update of updates) {
                const result = this.chats.update(update.id!, (chat) => {
                    if (update.unreadCount! > 0) {
                        update.unreadCount =
                            (chat.unreadCount || 0) + (update.unreadCount || 0)
                    }

                    Object.assign(chat, update)
                })
                if (!result) {
                    this.logger.debug(
                        { update },
                        'got update for non-existant chat'
                    )
                }
            }
        })
        ev.on('presence.update', ({ id, presences: update }) => {
            this.presences[id] = this.presences[id] || {}
            Object.assign(this.presences[id], update)
        })
        ev.on('chats.delete', (deletions) => {
            for (const item of deletions) {
                this.chats.deleteById(item)
            }
        })
        ev.on('messages.upsert', ({ messages: newMessages, type }) => {
            switch (type) {
                case 'append':
                case 'notify':
                    for (const msg of newMessages) {
                        const jid = jidNormalizedUser(msg.key.remoteJid!)
                        const list = this.assertMessageList(jid)
                        list.upsert(msg, 'append')

                        if (type === 'notify') {
                            if (!this.chats.get(jid)) {
                                ev.emit('chats.upsert', [
                                    {
                                        id: jid,
                                        conversationTimestamp: toNumber(
                                            msg.messageTimestamp!
                                        ),
                                        unreadCount: 1
                                    }
                                ])
                            }
                        }
                    }

                    break
            }
        })
        ev.on('messages.update', (updates) => {
            for (const { update, key } of updates) {
                const list = this.assertMessageList(key.remoteJid!)
                const result = list.updateAssign(key.id!, update)
                if (!result) {
                    this.logger.debug(
                        { update },
                        'got update for non-existent message'
                    )
                }
            }
        })
        ev.on('messages.delete', (item) => {
            if ('all' in item) {
                const list = this.messages[item.jid]
                list?.clear()
            } else {
                const jid = item.keys[0].remoteJid!
                const list = this.messages[jid]
                if (list) {
                    const idSet = new Set(item.keys.map((k) => k.id))
                    list.filter((m) => !idSet.has(m.key.id))
                }
            }
        })

        ev.on('groups.update', (updates) => {
            for (const update of updates) {
                if (this.groupMetadata[update.id!]) {
                    Object.assign(this.groupMetadata[update.id!], update)
                } else {
                    this.logger.debug(
                        { update },
                        'got update for non-existant group metadata'
                    )
                }
            }
        })

        ev.on('group-participants.update', ({ id, participants, action }) => {
            const metadata = this.groupMetadata[id]
            if (metadata) {
                switch (action) {
                    case 'add':
                        metadata.participants.push(
                            ...participants.map((id) => ({
                                id,
                                isAdmin: false,
                                isSuperAdmin: false
                            }))
                        )
                        break
                    case 'demote':
                    case 'promote':
                        for (const participant of metadata.participants) {
                            if (participants.includes(participant.id)) {
                                participant.isAdmin = action === 'promote'
                            }
                        }

                        break
                    case 'remove':
                        metadata.participants = metadata.participants.filter(
                            (p) => !participants.includes(p.id)
                        )
                        break
                }
            }
        })

        ev.on('message-receipt.update', (updates) => {
            for (const { key, receipt } of updates) {
                const obj = this.messages[key.remoteJid!]
                const msg = obj?.get(key.id!)
                if (msg) {
                    updateMessageWithReceipt(msg, receipt)
                }
            }
        })
    }

    toJSON = () => ({
        chats: this.chats,
        contacts: this.contacts,
        messages: this.messages
    })

    fromJSON = (json: {
        chats: Chat[]
        contacts: { [id: string]: Contact }
        messages: { [id: string]: WAMessage[] }
    }) => {
        this.chats.upsert(...json.chats)
        this.contactsUpsert(Object.values(this.contacts))
        for (const jid in json.messages) {
            const list = this.assertMessageList(jid)
            for (const msg of json.messages[jid]) {
                list.upsert(proto.WebMessageInfo.fromObject(msg), 'append')
            }
        }
    }
    writeToFile = (path: string) => {
        // require fs here so that in case "fs" is not available -- the app does not crash
        const { writeFileSync } = require('fs')
        writeFileSync(path, JSON.stringify(this.toJSON()))
    }
    readFromFile = (path: string) => {
        // require fs here so that in case "fs" is not available -- the app does not crash
        const { readFileSync, existsSync } = require('fs')
        if (existsSync(path)) {
            this.logger.debug({ path }, 'reading from file')
            const jsonStr = readFileSync(path, { encoding: 'utf-8' })
            const json = JSON.parse(jsonStr)
            this.fromJSON(json)
        }
    }
}
