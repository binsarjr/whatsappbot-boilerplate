import { BaileysEventEmitter, proto } from '@adiwajshing/baileys'
import { Command as Commander, CommanderError } from 'commander'
import Logger from './Logger'
import Message from './Message'
import {
    CmdType,
    CommandConfiguration,
    CommandHandler,
    CommandPropsHandler
} from './Types/Command'
import { isProducation } from './Utils/validate'

class Command {
    static instance: Command
    static getInstance(): Command {
        if (!Command.instance) {
            Command.instance = new Command()
        }
        return Command.instance
    }

    public availableCommands: { [key in CmdType]: CommandConfiguration[] } = {
        'chat-update': [],
        'chat-update-without-trigger': [],
        'list-response-message': []
    }

    /**
     * Registration command handler
     * @param configuration Command configuration
     */
    register(configuration: CommandConfiguration) {
        configuration.event.forEach((event) => {
            configuration.pattern ||= ''
            !configuration.whoCanUse?.length &&
                (configuration.whoCanUse = ['all'])
            Logger.info(
                configuration.name || configuration.pattern.toString(),
                `Registering command handler for "${event}"`
            )
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
            console.log(error, 'error')
            if (error instanceof CommanderError) {
                const showHelp = () => {
                    Message.reply(chat, {
                        text: (
                            program.helpInformation() +
                            '\n' +
                            helps.join('\n')
                        ).trim()
                    })
                }
                switch (error.code) {
                    case 'commander.missingArgument':
                        Message.reply(chat, { text: error.toString() })
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

    private async authorization(
        cmd: CommandConfiguration,
        chat: proto.IWebMessageInfo
    ): Promise<boolean> {
        if (cmd.whoCanUse) {
            if (cmd.whoCanUse.includes('all')) {
                return true
            }
            const jid = chat.key.remoteJid || ''
            if (cmd.whoCanUse.includes('private') && !Message.isGroup(jid)) {
                return true
            }
            if (cmd.whoCanUse.includes('group') && Message.isGroup(jid)) {
                return true
            }
            if (cmd.whoCanUse.includes('dev')) {
                if (Message.getPersonJid(chat) === process.env.DEV_JID)
                    return true
            }
            let participants = await Message.getParticipants(chat, 'all')
            if (cmd.whoCanUse.includes('admin')) {
                let admins = await Message.getParticipants(
                    participants,
                    'admin'
                )
                admins = admins.filter((admin) => admin.id == jid)
                return Boolean(admins.length)
            }
            if (cmd.whoCanUse.includes('member')) {
                let members = await Message.getParticipants(
                    participants,
                    'member'
                )
                members = members.filter((member) => member.id == jid)
                return Boolean(members.length)
            }
        }
        return false
    }

    /**
     * Running all registered command handlers
     */
    bind(ev: BaileysEventEmitter) {
        ev.on('messages.upsert', async (m) => {
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
            const message = Message.getCaption(last)

            Command.instance.availableCommands[
                'chat-update-without-trigger'
            ].forEach(async (cmd) => {
                /**
                 * Auhtorization who can use
                 */
                if (!(await Command.instance.authorization(cmd, last))) return
                /**
                 * if productionOnly is true then check if is production
                 */
                if (cmd.productionOnly && !isProducation()) {
                    return
                }
                let { propsHandler } = cmd
                let futureProps = {}
                if (propsHandler) {
                    let { next, props } =
                        await Command.instance.propsHandlerLayer(
                            propsHandler,
                            last,
                            message
                        )
                    if (!next) return
                    futureProps = props
                }
                cmd.handler({
                    chat: last,
                    message,
                    props: futureProps
                })
            })

            // Chat update event handler
            Command.instance.availableCommands['chat-update'].forEach(
                async (cmd) => {
                    const { pattern, handler, propsHandler } = cmd

                    /**
                     * Auhtorization who can use
                     */
                    if (!(await Command.instance.authorization(cmd, last)))
                        return
                    /**
                     * if productionOnly is true then check if is production
                     */
                    if (cmd.productionOnly && !isProducation()) {
                        return
                    }

                    let handlerResult: CommandHandler = {
                        chat: last,
                        message,
                        props: {}
                    }

                    switch (typeof pattern) {
                        case 'string':
                            if (message == pattern) {
                                if (propsHandler) {
                                    let { next, props } =
                                        await Command.instance.propsHandlerLayer(
                                            propsHandler,
                                            last,
                                            message
                                        )
                                    if (!next) return
                                    handlerResult.props = props
                                }
                                await handler(handlerResult)
                            }
                            break
                        case 'object':
                            if (pattern instanceof RegExp) {
                                let matched = message.match(pattern)
                                if (matched) {
                                    if (propsHandler) {
                                        let { next, props } =
                                            await Command.instance.propsHandlerLayer(
                                                propsHandler,
                                                last,
                                                message
                                            )
                                        if (!next) return
                                        handlerResult.props = props
                                    }

                                    await handler(handlerResult)
                                }
                            }

                            break
                    }
                }
            )

            // Chat update list response message event handler
            Command.instance.availableCommands['list-response-message'].forEach(
                async (cmd) => {
                    const { pattern, handler, propsHandler } = cmd

                    /**
                     * Auhtorization who can use
                     */
                    if (!(await Command.instance.authorization(cmd, last)))
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

                    let handlerResult: CommandHandler = {
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
                                    await Command.instance.propsHandlerLayer(
                                        propsHandler,
                                        last,
                                        message
                                    )
                                if (!next) return
                                handlerResult.props = props
                            }
                            handler(handlerResult)
                        }
                    } else if (matched) {
                        if (propsHandler) {
                            let { next, props } =
                                await Command.instance.propsHandlerLayer(
                                    propsHandler,
                                    last,
                                    message
                                )
                            if (!next) return
                            handlerResult.props = props
                        }
                        await handler(handlerResult)
                    }
                }
            )
        })
    }
}

export default Command.getInstance()
