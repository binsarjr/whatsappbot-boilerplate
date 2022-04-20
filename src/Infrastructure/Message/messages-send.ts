import {
    AnyMessageContent,
    MiscMessageGenerationOptions,
    proto,
    WASocket
} from '@adiwajshing/baileys'
import { MessageContent } from '../Types/Message'
import { randomNumber } from '../Supports/number'
import { sleep } from './../Supports/promises'
import { getPersonalJid } from '../Supports/messages'
export class MessageSend {
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
    sendMessage = async (
        jid: proto.IMessageKey,
        message: MessageContent,
        options?: MiscMessageGenerationOptions
    ): Promise<proto.IWebMessageInfo> => {
        await sleep(randomNumber(100, 500))
        this.throwIfSocketEmpty()
        await this.socket!.sendReadReceipt(
            jid.remoteJid || '',
            jid.participant || '',
            [jid.id || '']
        )
        await this.socket!.presenceSubscribe(jid.remoteJid || '')
        await this.socket!.sendPresenceUpdate('composing', jid.remoteJid || '')
        await sleep(randomNumber(1000, 2000))
        let msg = await this.socket!.sendMessage(
            jid.remoteJid || '',
            message as AnyMessageContent,
            options
        )
        await this.socket!.sendPresenceUpdate('paused', jid.remoteJid || '')

        return msg
    }

    reply = async (
        chat: proto.IWebMessageInfo,
        message: MessageContent,
        options: MiscMessageGenerationOptions = {}
    ) => {
        return this.sendMessage(chat.key, message, options)
    }

    replyIt = async (
        chat: proto.IWebMessageInfo,
        message: MessageContent,
        options: MiscMessageGenerationOptions = {}
    ) => {
        Object.assign(options, { quoted: chat })
        return this.sendMessage(chat.key, message, options)
    }

    replyAsPrivate = async (
        chat: proto.IWebMessageInfo,
        message: MessageContent,
        options: MiscMessageGenerationOptions = {}
    ) => {
        chat.key.remoteJid = getPersonalJid(chat)
        return this.sendMessage(chat.key, message, options)
    }

    replyItAsPrivate = async (
        chat: proto.IWebMessageInfo,
        message: MessageContent,
        options: MiscMessageGenerationOptions = {}
    ) => {
        Object.assign(options, { quoted: chat })
        chat.key.remoteJid = getPersonalJid(chat)
        return this.sendMessage(chat.key, message, options)
    }
}
