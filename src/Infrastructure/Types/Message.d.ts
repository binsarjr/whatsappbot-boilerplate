import {
    AnyMessageContent,
    MiscMessageGenerationOptions,
    proto
} from '@adiwajshing/baileys'

export interface MessageContext {
    reply: (
        message: AnyMessageContent,
        options?: MiscMessageGenerationOptions
    ) => Promise<proto.IWebMessageInfo>
    replyAsPrivate: (
        message: AnyMessageContent,
        options?: MiscMessageGenerationOptions
    ) => Promise<proto.IWebMessageInfo>
    sendWithRead: (
        message: AnyMessageContent,
        options?: MiscMessageGenerationOptions
    ) => Promise<proto.IWebMessageInfo>
    sendMessageWTyping: (
        message: AnyMessageContent,
        options?: MiscMessageGenerationOptions
    ) => Promise<proto.IWebMessageInfo>
}
