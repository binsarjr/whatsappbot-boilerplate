import got from 'got/dist/source'
import { ICommand } from '../Infrastructure/Command/ICommand'
import { Context } from '../Infrastructure/Invoker/Interface'
import { Request } from '../Infrastructure/Request'

export default class implements ICommand {
    async execute(request: Request<any>, context: Context): Promise<void> {
        await context.reply({
            text: 'Hello World, Private!'
        })
    }
}
