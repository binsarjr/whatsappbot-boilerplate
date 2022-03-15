import { proto, WASocket } from '@adiwajshing/baileys'
import { Command as Commander, CommanderError } from 'commander'
import Auth from './Auth'
import Logger from './Logger'
import Message, { getMessage, getMessageCaption } from './Message'
import Queue from './Queue'
import {
    CmdType,
    CommandConfiguration,
    CommandHandler,
    CommandPropsHandler
} from './Types/Command'
import { isProducation } from './Utils/validate'

export default class Command {
    queue = Queue.with('command_handler',{
        concurrency: 10
    })
    private prefix: string[] = []
    private message: Message = new Message()
    private commands: { [key in CmdType]: CommandConfiguration[] } = {
        'chat-update': [],
        'list-response-message': []
    }
    addPrefiz(prefix: string) {
        this.prefix.push(prefix)
    }
    setPrefix(prefix: string[]) {
        this.prefix = prefix
    }
    /**
     * Registration command handler
     * @param configuration Command configuration
     */
    register(configuration: CommandConfiguration) {
        configuration.events ||= ['chat-update']
        configuration.events.forEach((event) => {
            configuration.pattern ||= /.*/is
            configuration.whoCanUse ||= ['all']
            configuration.prefix = this.prefix
            Logger()
                .child({
                    event,
                    whoCanUse: configuration.whoCanUse,
                    productionOnly: configuration.productionOnly,
                    pattern: configuration.pattern
                })
                .info(`Registering command handler for event: ${event}`)
            this.commands[event].push(configuration)
        })
    }

    private async propsHandlerLayer(
        propsHandler: CommandPropsHandler,
        chat: proto.IWebMessageInfo,
        message: string
    ): Promise<{ props: object; next: boolean }> {
        const program = new Commander()
        program
            .exitOverride()
            .showSuggestionAfterError(false)
            .showHelpAfterError(false)

        const helps: string[] = []
        let isNext = false
        let props = {}
        const next = function (item: object) {
            props = item
            isNext = true
        }

        const addHelp = function (...str: string[]) {
            str.forEach((s) => helps.push(s))
        }
        try {
            await propsHandler({
                chat,
                program,
                message,
                addHelp,
                next
            })

            return {
                props,
                next: isNext
            }
        } catch (error) {
            if (error instanceof CommanderError) {
                const showHelp = () =>
                    this.message.reply(chat, {
                        text: (
                            program.helpInformation() +
                            '\n' +
                            helps.join('\n')
                        ).trim()
                    })

                switch (error.code) {
                    case 'commander.missingArgument':
                        await this.message.reply(chat, {
                            text: error.toString()
                        })
                        await showHelp()
                        break
                    case 'commander.helpDisplayed':
                    case 'commander.help':
                        await showHelp()
                        break

                    default:
                        throw error
                }
            } else {
                throw error
            }
            return {
                next: false,
                props: {}
            }
        }
    }

    bind(socket: WASocket) {
        this.message.bind(socket)

        socket.ev.on('messages.upsert', async (m) => {
            if (m.type === 'append' || m.type === 'notify') {
                console.log(JSON.stringify(m, undefined, 2))
            }

            let last = m.messages[0]
            if (!Boolean(last.message)) return

            const context = this.message.makingContext(last)

            const message = getMessageCaption(last) || ''

            // Chat update event handler
            this.commands['chat-update'].forEach(async (cmd) => {
                /**
                 * Auhtorization who can use
                 */
                if (!(await Auth.authorization(socket, cmd.whoCanUse!, last)))
                    return
                /**
                 * if productionOnly is true then check if is production
                 */
                if (cmd.productionOnly && !isProducation()) {
                    return
                }

                let handlerResult: Partial<CommandHandler> = {
                    chat: last,
                    message,
                    props: {}
                }

                if (cmd.pattern?.test(message)) {
                    if (cmd.propsHandler) {
                        let { next, props } = await this.propsHandlerLayer(
                            cmd.propsHandler,
                            last,
                            message
                        )
                        if (!next) return
                        handlerResult.props = props
                    }
                    Object.assign(context, handlerResult)
                    this.queue.add(() => cmd.handler(context as CommandHandler))
                }
            })

            // Chat update list response message event handler
            this.commands['list-response-message'].forEach(async (cmd) => {
                /**
                 * Auhtorization who can use
                 */
                if (!(await Auth.authorization(socket, cmd.whoCanUse!, last)))
                    return
                /**
                 * if productionOnly is true then check if is production
                 */
                if (cmd.productionOnly && !isProducation()) {
                    return
                }
                let response = getMessage(last)?.listResponseMessage

                let bodyListMessage =
                    response?.singleSelectReply?.selectedRowId || ''

                let handlerResult: Partial<CommandHandler> = {
                    chat: last,
                    message: bodyListMessage,
                    props: {}
                }
                if (cmd.pattern?.test(bodyListMessage)) {
                    if (cmd.propsHandler) {
                        let { next, props } = await this.propsHandlerLayer(
                            cmd.propsHandler,
                            last,
                            message
                        )
                        if (!next) return
                        handlerResult.props = props
                    }
                    Object.assign(context, handlerResult)
                    this.queue.add(() => cmd.handler(context as CommandHandler))
                }
            })
        })
    }
}
