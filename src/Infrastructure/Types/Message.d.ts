import {
    AnyMessageContent,
    MiscMessageGenerationOptions,
    proto
} from '@adiwajshing/baileys'

export type SendMessage = (
    message: AnyMessageContent,
    options?: MiscMessageGenerationOptions
) => Promise<proto.IWebMessageInfo>

export interface MessageContext {
    reply: SendMessage
    replyIt: SendMessage
    replyAsPrivate: SendMessage
    replyItAsPrivate: SendMessage
    sendWithRead: SendMessage
    sendMessageWTyping: SendMessage
}
