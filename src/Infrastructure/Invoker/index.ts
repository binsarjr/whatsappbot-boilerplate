import { IMessageMiddleware } from '../Middleware/MessageMiddleware'
import { Request } from '../Request'
import { ICommand } from '../Command/ICommand'
import { Context, EVENTS, LIST_COMMANDS } from './Interface'
import { WASocket } from '@adiwajshing/baileys'
import Message from '../Message'
import InvokerMessageMiddleware from './InvokerMessageMiddleware'

export default class Invoker {
    private commands: LIST_COMMANDS = {
        onMessage: []
    }

    private middlewares: { [i: string]: IMessageMiddleware[] } = {
        messages: []
    }
    private invokers: Invoker[] = []
    constructor(middlewares: IMessageMiddleware[] = []) {
        this.middlewares.messages = middlewares
    }

    public use(...middlewares: IMessageMiddleware[]) {
        middlewares = [...this.middlewares.messages, ...middlewares]
        const instance = new Invoker(middlewares)
        this.invokers.push(instance)
        return instance
    }

    public on(events: EVENTS[], command: ICommand) {
        events.map((event) => {
            if (event == 'onMessage') {
                this.onMessage(command)
            }
        })
        return this
    }

    public onMessage(command: ICommand) {
        this.assertCommand(command)
        this.commands.onMessage.push(command)
        return this
    }

    public bind(socket: WASocket) {
        const messageContext = new Message()
        messageContext.bind(socket)
        const ctx: Partial<Context> = {
            phoneUser: socket.user
        }

        this.invokers.map((invoker) => invoker.bind(socket))
        socket.ev.on('messages.upsert', async (m) => {
            if (m.messages?.length) if (m.messages[0].key.fromMe) return

            if (!Boolean(m.messages[0].message)) return

            const context = {
                messages: m.messages,
                lastMessage: m.messages[0]!,
                type: m.type
            }
            Object.assign(context, ctx)
            Object.assign(
                context,
                messageContext.makingContext(context.lastMessage!)
            )
            const request = new Request()

            await new InvokerMessageMiddleware()
                .setCommands(this.commands)
                .setMiddlewares(this.middlewares.messages)
                .handle(request, context as Context)
        })
    }
    private assertCommand(command: ICommand) {
        if (!this.isCommand(command))
            throw new Error('Please use command class')
    }
    private isCommand(object: any): object is ICommand {
        return object.execute !== undefined
    }
}
