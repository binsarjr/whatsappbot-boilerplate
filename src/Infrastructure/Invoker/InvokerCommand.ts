import { Request } from '../Request'
import { Context, InvokerAction, LIST_COMMANDS } from './Interface'

export default class InvokerCommand implements InvokerAction {
    private commands: Partial<LIST_COMMANDS> = {}
    setCommands(commands: Partial<LIST_COMMANDS>) {
        this.commands = commands
        return this
    }
    async handle(request: Request<any>, context: Context) {
        const futures: Promise<any>[] = []
        if (this.commands.onMessage) {
            futures.push(
                ...this.commands.onMessage.map(async (command) => {
                    return command.execute(request, context)
                })
            )
        }

        await Promise.all(futures)
    }
}
