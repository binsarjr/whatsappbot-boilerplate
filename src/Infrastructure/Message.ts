import {
    AnyMessageContent,
    AnyWASocket,
    delay,
    GroupMetadata,
    GroupParticipant,
    isJidGroup,
    MiscMessageGenerationOptions,
    proto,
    WALegacySocket,
    WASocket
} from '@adiwajshing/baileys'

class Message {
    socket: AnyWASocket | null = null
    static instance: Message
    static getInstance(): Message {
        if (!Message.instance) {
            Message.instance = new Message()
            Message.instance.socket = null
        }
        return Message.instance
    }
    bind(socket: AnyWASocket) {
        Message.instance.socket = socket
    }
    /**
     * Get message id from replied message
     * @param chat chat update
     * @returns string
     */
    getId(chat: proto.IWebMessageInfo): string {
        let id: string =
            chat.message?.extendedTextMessage?.contextInfo?.stanzaId ?? ''
        if (id == '') {
            id = chat.key.id ?? ''
        }
        return id
    }

    /**
     * Get personal id
     * @param chat chat update
     * @returns string jid
     */
    getPersonJid(chat: proto.IWebMessageInfo): string {
        let jid = chat.key.remoteJid ?? ''
        return this.isGroup(jid) ? chat.participant || '' : jid
    }

    /**
     * Check is group id or not
     * @param jid jid atau id whatsapp
     * @returns
     */
    isGroup(jid: string): boolean {
        return Boolean(isJidGroup(jid))
    }

    /**
     * Get caption from message
     * @param chat chat update
     * @returns string caption
     */
    getCaption(chat: proto.IWebMessageInfo) {
        let message =
            chat?.message?.conversation?.toString() ||
            chat.message?.ephemeralMessage?.message?.extendedTextMessage
                ?.text ||
            chat.message?.extendedTextMessage?.text ||
            ''

        if (message == '') {
            if (
                chat.message?.imageMessage ||
                chat.message?.ephemeralMessage?.message?.imageMessage
            ) {
                message =
                    chat.message?.imageMessage?.caption ||
                    chat.message?.ephemeralMessage?.message?.imageMessage
                        ?.caption ||
                    ''
            } else if (
                chat.message?.videoMessage ||
                chat.message?.ephemeralMessage?.message?.videoMessage
            ) {
                message =
                    chat.message?.videoMessage?.caption ||
                    chat.message?.ephemeralMessage?.message?.videoMessage
                        ?.caption ||
                    ''
            }
        }
        return message
    }

    /**
     * Send Message with typing
     * @param id id whatsapp
     * @param message Object message
     * @param options MessageOptions
     */
    async sendMessageWTyping(
        jid: string,
        message: AnyMessageContent,
        options?: MiscMessageGenerationOptions
    ): Promise<proto.IWebMessageInfo> {
        await this.socket!.presenceSubscribe(jid)
        await delay(500)

        await this.socket!.sendPresenceUpdate('composing', jid)
        await delay(2000)

        let msg = await this.socket!.sendMessage(jid, message, options)
        await this.socket!.sendPresenceUpdate('paused', jid)

        return msg
    }

    async reply(
        chat: proto.IWebMessageInfo,
        message: AnyMessageContent,
        options: MiscMessageGenerationOptions = {}
    ) {
        Object.assign(options, { quoted: chat })
        this.sendMessageWTyping(chat.key.remoteJid || '', message, options)
    }

    /**
     * Send Message with read
     * @param id id whatsapp
     * @param message Object message
     * @param options MessageOptions
     */
    async sendWithRead(
        jid: proto.IMessageKey,
        message: AnyMessageContent,
        options?: MiscMessageGenerationOptions
    ) {
        let msg
        if (Object.keys(this.socket!).includes('chatRead')) {
            await (this.socket as WALegacySocket)!.chatRead(jid, 1)
            msg = await this.sendMessageWTyping(
                jid.remoteJid || '',
                message,
                options
            )
        } else {
            await (this.socket as WASocket)!.sendReadReceipt(
                jid.remoteJid || '',
                jid.participant || '',
                [jid.id || '']
            )
            msg = await this.sendMessageWTyping(
                jid.remoteJid || '',
                message,
                options
            )
        }
        return msg
    }

    /**
     * Send Message with Queue
     * @param id id whatsapp
     * @param message Object message
     * @param options MessageOptions
     */
    async sendWithQueue(
        jid: proto.MessageKey,
        message: AnyMessageContent,
        options?: MiscMessageGenerationOptions
    ): Promise<void> {
        this.sendWithRead(jid, message, options)
    }

    async getParticipants(
        chatOrMetadataOrkeyOrParticipants:
            | GroupParticipant[]
            | proto.IWebMessageInfo
            | GroupMetadata
            | string,
        type: 'admin' | 'member' | 'all'
    ): Promise<GroupParticipant[]> {
        let participants: GroupParticipant[] = []

        if (chatOrMetadataOrkeyOrParticipants instanceof Array) {
            participants = chatOrMetadataOrkeyOrParticipants
        } else if (
            chatOrMetadataOrkeyOrParticipants instanceof proto.WebMessageInfo
        ) {
            let metadata = await this.socket!.groupMetadata(
                chatOrMetadataOrkeyOrParticipants.key.remoteJid || '',
                false
            )
            participants = metadata.participants
        } else if (typeof chatOrMetadataOrkeyOrParticipants === 'string') {
            let metadata = await this.socket!.groupMetadata(
                chatOrMetadataOrkeyOrParticipants,
                false
            )
            participants = metadata.participants
        } else {
            participants = (chatOrMetadataOrkeyOrParticipants as GroupMetadata)
                .participants
        }
        participants = participants.filter((participant) => {
            if (type == 'all') return true
            if (
                type == 'admin' &&
                (participant.isAdmin || participant.isSuperAdmin)
            )
                return true
            if (
                type == 'member' &&
                !(participant.isAdmin || participant.isSuperAdmin)
            )
                return true
        })
        return participants
    }
}

export default Message.getInstance()
