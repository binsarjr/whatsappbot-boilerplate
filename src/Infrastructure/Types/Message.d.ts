import {
    AnyMessageContent,
    MiscMessageGenerationOptions,
    proto
} from '@adiwajshing/baileys'

export type MessageContent = AnyMessageContent & {
    contextInfo?: Partial<{
        /**
         * Preview Link
         */
        externalAdReply: Partial<{
            title: string
            body: string
            thumbnail: Buffer
        }>
        forwardingScore: number
        isForwarded: boolean
    }>
}

export type SendMessage<Response = proto.IWebMessageInfo> = (
    message: MessageContent,
    options?: MiscMessageGenerationOptions
) => Promise<Response>

export interface MessageContext {
    isGroup: () => boolean
    reply: SendMessage
    replyIt: SendMessage
    replyAsPrivate: SendMessage
    replyItAsPrivate: SendMessage
    sendMessage: SendMessage
}
