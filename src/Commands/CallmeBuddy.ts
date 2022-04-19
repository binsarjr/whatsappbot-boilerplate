import { ICommand } from '../Infrastructure/Command/ICommand'
import { Context } from '../Infrastructure/Invoker/Interface'
import { Request } from '../Infrastructure/Request'

export default class implements ICommand {
    async execute(
        request: Request<{
            name: string
        }>,
        context: Context
    ): Promise<void> {
        await context.reply({
            text: `Hello ${request.get('name')}!`
        })
    }
}
