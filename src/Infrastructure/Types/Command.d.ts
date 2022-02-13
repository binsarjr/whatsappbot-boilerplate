import { proto } from '@adiwajshing/baileys'
import { Command } from 'commander'

export type CmdType =
    | 'chat-update'
    | 'chat-update-without-trigger'
    | 'list-response-message'

export interface CommandHandler<Props = any> {
    chat: proto.IWebMessageInfo
    message: string
    props: Props
}

export interface CommandPropsHandlerOptions {
    program: Command
    message: string
    chat: proto.IWebMessageInfo
    addHelp: (...str: string[]) => void
    next: (data: object) => void
}

export type CommandPropsHandler = (
    kwargs: CommandPropsHandlerOptions
) => Promise<void>
export type CommandUserType =
    | 'admin'
    | 'dev'
    | 'member'
    | 'private'
    | 'group'
    | 'all'
export interface CommandConfiguration {
    /**
     * Command pattern to match. set empty string if you want to match all messages or use event chat-update without trigger
     */
    pattern?: string | RegExp
    events: CmdType[]
    productionOnly?: boolean
    whoCanUse?: CommandUserType[]
    /**
     * Prop handler is for how we manage the data to be fetched and go to the next stage
     * which will be sent to the props object in the handler function
     */
    propsHandler?: CommandPropsHandler

    handler: (kwargs: CommandHandler) => Promise<any>
}
