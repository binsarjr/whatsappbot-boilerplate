import { ICommand } from '../Infrastructure/Command/ICommand'
import { Context } from '../Infrastructure/Invoker/Interface'
import { Request } from '../Infrastructure/Request'

export default class implements ICommand {
    async execute(request: Request<any>, context: Context): Promise<void> {
        context.replyIt({
            text: 'Hello, group!'
        })
    }
}
