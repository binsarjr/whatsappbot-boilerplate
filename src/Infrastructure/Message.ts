import {
    AnyMessageContent,
    delay,
    GroupMetadata,
    GroupParticipant,
    isJidGroup,
    MiscMessageGenerationOptions,
    proto,
    WASocket
} from '@adiwajshing/baileys'

/**
 * Get message id from replied message
 * @param chat chat update
 * @returns string
 */
export const getId = (chat: proto.IWebMessageInfo): string => {
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
export const getPersonalJid = (chat: proto.IWebMessageInfo): string => {
    let jid = chat.key.remoteJid ?? ''

    return (
        isJidGroup(jid) ? chat.participant || chat.key.participant || '' : jid
    ).replace(/:.*@/, '@')
}

/**
 * Get caption from message
 * @param chat chat update
 * @returns string caption
 */
export const getCaption = (chat: proto.IWebMessageInfo) => {
    let message =
        chat?.message?.conversation?.toString() ||
        chat.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
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
        let metadata = await socket!.groupMetadata(
            (chatOrMetadataOrkeyOrParticipantsOrJid as proto.IWebMessageInfo)
                .key.remoteJid || ''
        )

        participants = metadata.participants
    } else if (typeof chatOrMetadataOrkeyOrParticipantsOrJid === 'string') {
        let metadata = await socket!.groupMetadata(
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
    throwIfSocketEmpty() {
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
        await delay(500)

        await this.socket!.sendPresenceUpdate('composing', jid.remoteJid || '')
        await delay(2000)

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
        Object.assign(options, { quoted: chat })
        this.sendMessageWTyping(chat.key, message, options)
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

    bind(sock: WASocket) {
        this.socket = sock
    }
}
