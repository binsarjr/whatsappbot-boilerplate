import { getMessageCaption } from '../Infrastructure/Foundations/messages'
import { Context } from '../Infrastructure/Invoker/Interface'
import {
    IMessageMiddleware,
    NextMiddleware
} from '../Infrastructure/Middleware/MessageMiddleware'
import { Request } from '../Infrastructure/Request'

export default class implements IMessageMiddleware {
    async handle(
        request: Request<any>,
        context: Context,
        next: NextMiddleware
    ): Promise<void> {
        const [_, name] = getMessageCaption(context.lastMessage)?.split(
            /\s+/,
            2
        ) || ['', '']
        request.set('name', name)
        next(request)
    }
}
