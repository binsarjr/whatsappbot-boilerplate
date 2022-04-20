import { isJidGroup, isJidUser } from '@adiwajshing/baileys'
import {
    getMessage,
    getMessageCaption
} from '../Infrastructure/Supports/messages'
import { concatRegexp, glob2regex } from '../Infrastructure/Supports/regex'
import { Context } from '../Infrastructure/Invoker/Interface'
import {
    IMessageMiddleware,
    NextMiddleware
} from '../Infrastructure/Middleware/MessageMiddleware'
import { Request } from '../Infrastructure/Request'

interface Options {
    // default true
    prefix: boolean
}

export default class Pattern implements IMessageMiddleware {
    public static prefix: RegExp = /^(?:!|\/|\.|#)\s{0,}/
    private pattern: RegExp
    constructor(
        // Regex or Glob2Regex
        pattern: RegExp | string,
        opts: Options = {
            prefix: true
        }
    ) {
        if (typeof opts.prefix == 'undefined') {
            opts.prefix = true
        }

        if (typeof pattern == 'string') {
            this.pattern = glob2regex(pattern, {
                extended: true,
                withPrefix: false,
                withSuffix: true,
                globstar: false,
                flags: 'is'
            })
        } else {
            this.pattern = pattern
        }
        if (opts?.prefix) {
            this.pattern = concatRegexp(Pattern.prefix, this.pattern)
        }
    }
    async handle(
        request: Request<any>,
        context: Context,
        next: NextMiddleware
    ): Promise<void> {
        const msg = getMessage(context.lastMessage)
        const body =
            msg?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg?.buttonsResponseMessage?.selectedButtonId ||
            getMessageCaption(context.lastMessage) ||
            ''
        if (this.pattern.test(body)) {
            return next(request)
        }
    }
}
