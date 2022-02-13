import {
    AnyMessageContent,
    GroupMetadata,
    GroupParticipant,
    isJidUser,
    MiscMessageGenerationOptions,
    proto,
    WASocket
} from '@adiwajshing/baileys'

export const getQuotedMessageCaptionWith = (
    m: proto.IWebMessageInfo,
    type?: 'ephemeralMessage' | 'viewOnceMessage'
) => {
    let msg: proto.IMessage | null =
        m.message!
    if (type) msg = (m.message![type] as proto.IFutureProofMessage)?.message!
    return (
        msg?.conversation ||
        msg?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation||
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
    if (type) msg = (m.message![type] as proto.IFutureProofMessage)?.message!
    return (
        msg?.conversation ||
        msg?.extendedTextMessage?.text||
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
