import {
    Chat,
    Contact,
    MessageUpdateType,
    WAMessage
} from '@adiwajshing/baileys'
import { ICommand } from '../Command/ICommand'
import { Request } from '../Request'
import { MessageContext } from '../Types/Message'

export type EVENTS = 'onMessage'
export type LIST_COMMANDS = { [key in EVENTS]: ICommand[] }
export type Context = MessageContext & {
    chats: Chat[]
    messages: WAMessage[]
    lastMessage: WAMessage
    type: MessageUpdateType
    phoneUser: Contact
}
export interface InvokerAction {
    handle(request: Request, context: Context): Promise<void>
}
