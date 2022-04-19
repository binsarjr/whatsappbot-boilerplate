import { Context } from '../Invoker/Interface'
import { Request } from '../Request'

export interface ICommand {
    execute(request: Request, context: Context): Promise<void>
}
