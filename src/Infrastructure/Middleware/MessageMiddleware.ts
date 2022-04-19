import { Context } from '../Invoker/Interface'
import { Request } from '../Request'

export type NextMiddleware = (request: Request) => void

export interface IMessageMiddleware {
    handle(
        request: Request<any>,
        context: Context,
        next: NextMiddleware
    ): Promise<void>
}
