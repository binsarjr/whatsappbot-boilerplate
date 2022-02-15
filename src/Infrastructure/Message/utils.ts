import {
    GroupMetadata,
    GroupParticipant,
    isJidUser,
    proto,
    WASocket
} from '@adiwajshing/baileys'

/**
 * Get message content ignoring that is ephemeral or view once
 * @param chat chat update
 * @returns proto.IMessage message
 */
export const getMessage = (chat: proto.IWebMessageInfo) => {
    let keys = Object.keys(chat.message || {})
    if (keys.includes('ephemeralMessage')) {
        return chat.message?.ephemeralMessage!.message
    } else if (keys.includes('viewOnceMessage')) {
        return chat.message?.viewOnceMessage!.message
    } else {
        return chat.message
    }
}

/**
 * Get caption from message
 * @param chat chat update
 * @returns string caption
 */
export const getMessageCaption = (m: proto.IWebMessageInfo) => {
    let msg = getMessage(m)
    return (
        msg?.conversation ||
        msg?.extendedTextMessage?.text ||
        msg?.imageMessage?.caption ||
        msg?.videoMessage?.caption ||
        null
    )
}

/**
 * Get extended caption from message
 * @param chat chat update
 * @returns string caption
 */
export const getQuotedMessageCaption = (m: proto.IWebMessageInfo) => {
    let msg = getMessage(m)
    return (
        msg?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
        msg?.extendedTextMessage?.contextInfo?.quotedMessage
            ?.extendedTextMessage?.text ||
        msg?.imageMessage?.contextInfo?.quotedMessage?.conversation ||
        msg?.videoMessage?.contextInfo?.quotedMessage?.conversation ||
        null
    )
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
