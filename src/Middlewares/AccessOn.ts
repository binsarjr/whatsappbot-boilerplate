import { isJidGroup, isJidUser } from '@adiwajshing/baileys'
import { Context } from '../Infrastructure/Invoker/Interface'
import {
    IMessageMiddleware,
    NextMiddleware
} from '../Infrastructure/Middleware/MessageMiddleware'
import { Request } from '../Infrastructure/Request'

type ROLE = 'group' | 'private'

export default class implements IMessageMiddleware {
    private roles: ROLE[] = []
    constructor(...roles: ROLE[]) {
        this.roles = roles
    }
    async handle(
        request: Request<any>,
        context: Context,
        next: NextMiddleware
    ): Promise<void> {
        let canAccess = false
        const jid = context.lastMessage.key.remoteJid || ''
        for (const role of this.roles) {
            if (role == 'group') canAccess = isJidGroup(jid)
            if (role == 'private') canAccess = isJidUser(jid)
        }
        if (canAccess) next(request)
    }
}
