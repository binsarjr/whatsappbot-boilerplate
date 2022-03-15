import {
    AnyMessageContent,
    MiscMessageGenerationOptions,
    proto
} from '@adiwajshing/baileys'

export type MessageContent = AnyMessageContent & {
    contextInfo?: Partial<proto.IContextInfo>
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
