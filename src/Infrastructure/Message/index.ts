import { isJidGroup, proto, WASocket } from '@adiwajshing/baileys'
import PQueue from 'p-queue'
import { MessageContext } from '../Types/Message'
import { MessageSend } from './messages-send'

export * from './utils'

export default class Message extends MessageSend {
    private queue = new PQueue({
        concurrency: 5,
        interval: 1000
    })
    makingContext(chat: proto.IWebMessageInfo): MessageContext {
        return {
            isGroup: () => isJidGroup(chat.key.remoteJid || ''),
            reply: async (message, options) =>
                this.queue.add(() => this.reply(chat, message, options)),
            replyIt: async (message, options) =>
                this.queue.add(() => this.replyIt(chat, message, options)),
            replyAsPrivate: async (message, options) =>
                this.queue.add(() =>
                    this.replyAsPrivate(chat, message, options)
                ),
            replyItAsPrivate: async (message, options) =>
                this.queue.add(() =>
                    this.replyItAsPrivate(chat, message, options)
                ),
            sendMessage: (message, options) =>
                this.queue.add(() =>
                    this.sendMessage(chat.key, message, options)
                )
        }
    }

    bind(sock: WASocket) {
        this.socket = sock
    }
}
