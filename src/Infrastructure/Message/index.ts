import { proto, WASocket } from '@adiwajshing/baileys'
import { MessageContext } from '../Types/Message'
import { MessageSend } from './messages-send'

export * from './utils'

export default class Message extends MessageSend {
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
            sendMessage: (message, options) =>
                this.sendMessage(chat.key, message, options)
        }
    }

    bind(sock: WASocket) {
        this.socket = sock
    }
}
