import {
    AnyMessageContent,
    GroupMetadata,
    GroupParticipant,
    isJidUser,
    MiscMessageGenerationOptions,
    proto,
    WASocket
} from '@adiwajshing/baileys'
import { MessageContext } from './Types/Message'

export const getQuotedMessageCaptionWith = (
    m: proto.IWebMessageInfo,
    type?: 'ephemeralMessage' | 'viewOnceMessage'
) => {
    let msg: proto.IMessage | null = m.message!
    if (type && Object.keys(m).includes(type))
        msg = (m.message![type] as proto.IFutureProofMessage)?.message!
    return (
        msg?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
        msg?.imageMessage?.contextInfo?.quotedMessage?.conversation ||
        msg?.videoMessage?.contextInfo?.quotedMessage?.conversation ||
        null
    )
}

export const getMessageCaptionWith = (
    m: proto.IWebMessageInfo,
    type?: 'ephemeralMessage' | 'viewOnceMessage'
) => {
    let msg: proto.IMessage | null = m.message!
    if (type && Object.keys(m).includes(type))
        msg = (m.message![type] as proto.IFutureProofMessage)?.message!
    return (
        msg?.conversation ||
        msg?.extendedTextMessage?.text ||
        msg?.imageMessage?.caption ||
        msg?.videoMessage?.caption ||
        null
    )
}

/**
 * Get caption from message
 * @param chat chat update
 * @returns string caption
 */
export const getMessageCaption = (m: proto.IWebMessageInfo) =>
    getMessageCaptionWith(m) ||
    getMessageCaptionWith(m, 'ephemeralMessage') ||
    getMessageCaptionWith(m, 'viewOnceMessage') ||
    null

/**
 * Get extended caption from message
 * @param chat chat update
 * @returns string caption
 */
export const getQuotedMessageCaption = (m: proto.IWebMessageInfo) =>
    getQuotedMessageCaptionWith(m) ||
    getQuotedMessageCaptionWith(m, 'ephemeralMessage') ||
    getQuotedMessageCaptionWith(m, 'viewOnceMessage') ||
    null

/**
 * Get message content ignoring that is ephemeral or view once
 * @param chat chat update
 * @returns proto.IMessage message
 */
export const getMessage = (chat: proto.IWebMessageInfo) => {
    if ('ephemeralMessage' in chat.message!) {
        return chat.message.ephemeralMessage!.message
    } else if ('viewOnceMessage' in chat.message!) {
        return chat.message.viewOnceMessage!.message
    } else {
        return chat.message
    }
}

export const getImageOrVideo = (chat: proto.IWebMessageInfo) => {
    let msg = getMessage(chat)
    return (
        msg?.imageMessage ||
        msg?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
        msg?.videoMessage ||
        msg?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ||
        null
    )
}
/**
 * Get message id from replied message
 * @param chat chat update
 * @returns string
 */
export const getId = (chat: proto.IWebMessageInfo): string => {
    let id: string =
        chat.message?.extendedTextMessage?.contextInfo?.stanzaId || ''

    if (id == '') {
        id = chat.key.id || ''
    }
    return id
}

/**
 * Get personal id
 * @param chat chat update
 * @returns string jid
 */
export const getPersonalJid = (chat: proto.IWebMessageInfo): string => {
    let jid = chat.key.remoteJid || ''

    return (
        isJidUser(jid) ? jid : chat.participant || chat.key.participant || ''
    ).replace(/:.*@/, '@')
}

export const getParticipants = async (
    socket: WASocket,
    chatOrMetadataOrkeyOrParticipantsOrJid:
        | GroupParticipant[]
        | proto.IWebMessageInfo
        | GroupMetadata
        | string,
    type: 'admin' | 'member' | 'all'
): Promise<GroupParticipant[]> => {
    let participants: GroupParticipant[] = []

    if (chatOrMetadataOrkeyOrParticipantsOrJid instanceof Array) {
        participants = chatOrMetadataOrkeyOrParticipantsOrJid
    } else if (
        Object.keys(chatOrMetadataOrkeyOrParticipantsOrJid).includes('key') &&
        Object.keys(chatOrMetadataOrkeyOrParticipantsOrJid).includes('message')
    ) {
        let metadata = await socket.groupMetadata(
            (chatOrMetadataOrkeyOrParticipantsOrJid as proto.IWebMessageInfo)
                .key.remoteJid || ''
        )

        participants = metadata.participants
    } else if (typeof chatOrMetadataOrkeyOrParticipantsOrJid === 'string') {
        let metadata = await socket.groupMetadata(
            chatOrMetadataOrkeyOrParticipantsOrJid
        )
        participants = metadata.participants
    } else {
        participants = (chatOrMetadataOrkeyOrParticipantsOrJid as GroupMetadata)
            .participants
    }
    participants = participants.filter((participant) => {
        if (type == 'all') return true
        const isAdmin =
            participant.isAdmin || participant.isSuperAdmin || participant.admin
        if (type == 'admin' && isAdmin) return true
        if (type == 'member' && !isAdmin) return true
    })
    return participants
}
export default class Message {
    socket?: WASocket
    private throwIfSocketEmpty() {
        if (!this.socket)
            throw new Error('Please bind first before use this function')
    }
    /**
     * Send Message with typing
     * @param id id whatsapp
     * @param message Object message
     * @param options MessageOptions
     */
    sendMessageWTyping = async (
        jid: proto.IMessageKey,
        message: AnyMessageContent,
        options?: MiscMessageGenerationOptions
    ): Promise<proto.IWebMessageInfo> => {
        this.throwIfSocketEmpty()
        await this.socket!.presenceSubscribe(jid.remoteJid || '')

        await this.socket!.sendPresenceUpdate('composing', jid.remoteJid || '')

        let msg = await this.socket!.sendMessage(
            jid.remoteJid || '',
            message,
            options
        )
        await this.socket!.sendPresenceUpdate('paused', jid.remoteJid || '')

        return msg
    }

    reply = async (
        chat: proto.IWebMessageInfo,
        message: AnyMessageContent,
        options: MiscMessageGenerationOptions = {}
    ) => {
        return this.sendMessageWTyping(chat.key, message, options)
    }

    replyIt = async (
        chat: proto.IWebMessageInfo,
        message: AnyMessageContent,
        options: MiscMessageGenerationOptions = {}
    ) => {
        Object.assign(options, { quoted: chat })
        return this.reply(chat, message, options)
    }

    replyAsPrivate = async (
        chat: proto.IWebMessageInfo,
        message: AnyMessageContent,
        options: MiscMessageGenerationOptions = {}
    ) => {
        chat.key.remoteJid = getPersonalJid(chat)
        return this.reply(chat, message, options)
    }

    replyItAsPrivate = async (
        chat: proto.IWebMessageInfo,
        message: AnyMessageContent,
        options: MiscMessageGenerationOptions = {}
    ) => {
        Object.assign(options, { quoted: chat })
        chat.key.remoteJid = getPersonalJid(chat)
        return this.reply(chat, message, options)
    }

    /**
     * Send Message with read
     * @param id id whatsapp
     * @param message Object message
     * @param options MessageOptions
     */
    sendWithRead = async (
        jid: proto.IMessageKey,
        message: AnyMessageContent,
        options?: MiscMessageGenerationOptions
    ) => {
        this.throwIfSocketEmpty()

        await (this.socket as WASocket)!.sendReadReceipt(
            jid.remoteJid || '',
            jid.participant || '',
            [jid.id || '']
        )

        return this.sendMessageWTyping(jid, message, options)
    }

    makingContext(chat: proto.IWebMessageInfo): MessageContext {
        return {
            reply: async (message, options) =>
                this.reply(chat, message, options),
            replyIt: async (message, options) =>
                this.replyIt(chat, message, options),
            replyAsPrivate: async (message, options) =>
                this.replyAsPrivate(chat, message, options),
            replyItAsPrivate: async (message, options) =>
                this.replyItAsPrivate(chat, message, options),
            sendWithRead: (message, options) =>
                this.sendWithRead(chat.key, message, options),
            sendMessageWTyping: (message, options) =>
                this.sendMessageWTyping(chat.key, message, options)
        }
    }

    bind(sock: WASocket) {
        this.socket = sock
    }
}
