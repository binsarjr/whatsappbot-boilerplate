import makeWASocket, {
    BaileysEventEmitter,
    DisconnectReason,
    SocketConfig,
    WASocket
} from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'
import Auth from './Auth'
import Command from './Command'
import Message from './Message'
import Store from './Store'

export default class WABOT {
    message: Message
    store: Store
    command: Command
    auth: Auth
    socket?: WASocket
    private socketsBinding: ((socket: WASocket) => void)[] = []
    private eventsBinding: ((ev: BaileysEventEmitter) => void)[] = []
    private name: string
    private config: Partial<SocketConfig>
    constructor(options: { name: string; config: Partial<SocketConfig> }) {
        let { name, config } = options
        this.name = name
        this.config = config
        this.message = new Message()
        this.store = new Store({
            filepath: `${this.name}-baileys_store_multi.json`
        })
        this.auth = new Auth(`${this.name}.json`)
        if (!this.config.auth) {
            this.config.auth = undefined
        }
        this.config.auth = this.auth.state
        this.command = new Command()
    }

    addSocketBinding(...socks: ((socket: WASocket) => void)[]) {
        this.socketsBinding.push(...socks)
    }
    addEventBinding(...event: ((ev: BaileysEventEmitter) => void)[]) {
        this.eventsBinding.push(...event)
    }

    async clear(removeStarred: boolean = false) {
        // baileys wa socket not working with chat modify for now
        // for (let chat of this.store.chats.all()) {
        //     let messagges: { id: string; fromMe?: boolean }[] =
        //         this.store.messages[chat.id]
        //             .toJSON()
        //             .filter((f) => {
        //                 if (removeStarred) return true
        //                 return !f.starred
        //             })
        //             .map((m) => ({ id: m.key.id! }))

        //     await this.socket!.chatModify(
        //         {
        //             clear: { messages: messagges }
        //         },
        //         chat.id,
        //         // @ts-ignore
        //         []
        //     )
        // }
        this.store.clearAll()
    }

    start() {
        this.socket = makeWASocket(this.config)
        this.message.bind(this.socket)
        this.store.bind(this.socket.ev)
        this.store.saving()
        this.command.bind(this.socket)
        this.socketsBinding.forEach((sock) => sock(this.socket!))
        this.eventsBinding.forEach((ev) => ev(this.socket!.ev))

        this.socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update
            if (connection === 'close') {
                // reconnect if not logged out
                if (
                    (lastDisconnect!.error as Boom)?.output?.statusCode !==
                    DisconnectReason.loggedOut
                ) {
                    this.socket = this.start()
                } else {
                    this.store.delete()
                    this.auth.store.delete()
                    console.log('connection closed')
                }
            }
            console.log('connection update', update)
        })
        this.socket.ev.on('creds.update', this.auth.saveState)
        return this.socket
    }
}
