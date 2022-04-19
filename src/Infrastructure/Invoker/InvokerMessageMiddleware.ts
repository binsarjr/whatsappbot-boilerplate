import { IMessageMiddleware } from '../Middleware/MessageMiddleware'
import { Request } from '../Request'
import { Context, InvokerAction, LIST_COMMANDS } from './Interface'
import InvokerCommand from './InvokerCommand'

export default class InvokerMessageMiddleware implements InvokerAction {
    private commands: Partial<LIST_COMMANDS> = {}
    private middlewares: IMessageMiddleware[] = []
    setCommands(commands: LIST_COMMANDS) {
        this.commands = commands
        return this
    }
    setMiddlewares(middlewares: IMessageMiddleware[]) {
        this.middlewares = middlewares
        return this
    }
    async handle(request: Request<any>, context: Context) {
        let isNext = true
        for (const middleware of this.middlewares) {
            isNext = false
            const next = (req: Request) => {
                isNext = true
                request = req
            }
            await middleware.handle(request, context, next)
            if (!isNext) {
                break
            }
        }
        if (isNext) {
            return new InvokerCommand()
                .setCommands(this.commands)
                .handle(request, context)
        }
    }
}
