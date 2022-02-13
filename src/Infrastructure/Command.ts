import { proto, WASocket } from '@adiwajshing/baileys'
import { Command as Commander, CommanderError } from 'commander'
import PQueue from 'p-queue'
import Auth from './Auth'
import Logger from './Logger'
import Message, { getMessageCaption } from './Message'
import {
    CmdType,
    CommandConfiguration,
    CommandHandler,
    CommandPropsHandler
} from './Types/Command'
import { MessageContext } from './Types/Message'
import { isProducation } from './Utils/validate'

export default class Command {
    queue = new PQueue({
        concurrency: 10
    })
    private message: Message = new Message()
    availableCommands: { [key in CmdType]: CommandConfiguration[] } = {
        'chat-update': [],
        'chat-update-without-trigger': [],
        'list-response-message': []
    }
    /**
     * Registration command handler
     * @param configuration Command configuration
     */
    register(configuration: CommandConfiguration) {
        configuration.events.forEach((event) => {
            configuration.pattern ||= ''
            !configuration.whoCanUse?.length &&
            (configuration.whoCanUse = ['all'])
            
            Logger().child({
                event,
                whoCanUse: configuration.whoCanUse,
                productionOnly: configuration.productionOnly,
                pattern: configuration.pattern
            }).info(`Registering command handler for event: ${event}`)
            this.availableCommands[event].push(configuration)
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
                const showHelp = () => {
                    this.message.reply(chat, {
                        text: (
                            program.helpInformation() +
                            '\n' +
                            helps.join('\n')
                        ).trim()
                    })
                }
                switch (error.code) {
                    case 'commander.missingArgument':
                        this.message.reply(chat, { text: error.toString() })
                        showHelp()
                        break
                    case 'commander.helpDisplayed':
                    case 'commander.help':
                        showHelp()
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
            if (
                m.messages[0].key.fromMe ||
                Object.keys(m.messages[0].message || []).includes(
                    'protocolMessage'
                )
            )
                return
            let last = m.messages[0]
            const context = this.message.makingContext(last)

            const message = getMessageCaption(last) || ''
            console.log(JSON.stringify(m, null, 2))

            this.availableCommands['chat-update-without-trigger'].forEach(
                async (cmd) => {
                    /**
                     * Auhtorization who can use
                     */
                    if (
                        !(await Auth.authorization(
                            socket,
                            cmd.whoCanUse!,
                            last
                        ))
                    )
                        return
                    /**
                     * if productionOnly is true then check if is production
                     */
                    if (cmd.productionOnly && !isProducation()) {
                        return
                    }
                    let { propsHandler } = cmd
                    let futureProps = {}
                    if (propsHandler) {
                        let { next, props } = await this.propsHandlerLayer(
                            propsHandler,
                            last,
                            message
                        )
                        if (!next) return
                        futureProps = props
                    }
                    Object.assign(context, {
                        chat: last,
                        message,
                        props: futureProps
                    })
                    this.queue.add(() =>
                        cmd.handler(context as CommandHandler)
                    )
                }
            )

            // Chat update event handler
            this.availableCommands['chat-update'].forEach(async (cmd) => {
                const { pattern, handler, propsHandler } = cmd

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

                switch (typeof pattern) {
                    case 'string':
                        if (message == pattern) {
                            if (propsHandler) {
                                let { next, props } =
                                    await this.propsHandlerLayer(
                                        propsHandler,
                                        last,
                                        message
                                    )
                                if (!next) return
                                handlerResult.props = props
                            }

                            Object.assign(context, handlerResult)
                            this.queue.add(() =>
                                handler(
                                    context as CommandHandler
                                )
                            )
                        }
                        break
                    case 'object':
                        if (pattern instanceof RegExp) {
                            let matched = message.match(pattern)
                            if (matched) {
                                if (propsHandler) {
                                    let { next, props } =
                                        await this.propsHandlerLayer(
                                            propsHandler,
                                            last,
                                            message
                                        )
                                    if (!next) return
                                    handlerResult.props = props
                                }
                                Object.assign(context, handlerResult)
                                this.queue.add(() =>
                                    handler(
                                        context as CommandHandler &
                                            MessageContext
                                    )
                                )
                            }
                        }

                        break
                }
            })

            // Chat update list response message event handler
            this.availableCommands['list-response-message'].forEach(
                async (cmd) => {
                    const { pattern, handler, propsHandler } = cmd

                    /**
                     * Auhtorization who can use
                     */
                    if (
                        !(await Auth.authorization(
                            socket,
                            cmd.whoCanUse!,
                            last
                        ))
                    )
                        return
                    /**
                     * if productionOnly is true then check if is production
                     */
                    if (cmd.productionOnly && !isProducation()) {
                        return
                    }
                    let matched: RegExpMatchArray | null | string = null
                    let response =
                        last.message?.listResponseMessage ||
                        last.message?.ephemeralMessage?.message
                            ?.listResponseMessage
                    let bodyListMessage =
                        response?.singleSelectReply?.selectedRowId || ''

                    let handlerResult: Partial<CommandHandler> = {
                        chat: last,
                        message,
                        props: {}
                    }
                    switch (typeof pattern) {
                        case 'string':
                            if (bodyListMessage == pattern) matched = pattern
                            break
                        case 'object':
                            matched = bodyListMessage.match(pattern)
                            break
                    }

                    if (
                        response &&
                        response?.singleSelectReply?.selectedRowId == pattern
                    ) {
                        if (matched) {
                            if (propsHandler) {
                                let { next, props } =
                                    await this.propsHandlerLayer(
                                        propsHandler,
                                        last,
                                        message
                                    )
                                if (!next) return
                                handlerResult.props = props
                            }
                            Object.assign(context, handlerResult)
                            this.queue.add(() =>
                                handler(
                                    context as CommandHandler
                                )
                            )
                        }
                    } else if (matched) {
                        if (propsHandler) {
                            let { next, props } = await this.propsHandlerLayer(
                                propsHandler,
                                last,
                                message
                            )
                            if (!next) return
                            handlerResult.props = props
                        }
                        Object.assign(context, handlerResult)
                        this.queue.add(() =>
                            handler(context as CommandHandler)
                        )
                    }
                }
            )
        })
    }
}
