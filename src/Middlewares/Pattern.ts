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
    private patterns: RegExp[] = []
    constructor(
        // Regex or Glob2Regex
        pattern: RegExp | string | (string | RegExp)[],
        opts: Options = {
            prefix: true
        }
    ) {
        if (typeof opts.prefix == 'undefined') {
            opts.prefix = true
        }
        if (Array.isArray(pattern))
            pattern.forEach((p) => {
                this.patterns.push(this.patternHandler(p))
            })
        else this.patterns = [this.patternHandler(pattern)]
        if (opts?.prefix) {
            this.patterns = this.patterns.map((pattern) =>
                concatRegexp(Pattern.prefix, pattern)
            )
        }
    }
    private patternHandler(pattern: string | RegExp) {
        if (typeof pattern == 'string') {
            return glob2regex(pattern, {
                extended: true,
                withPrefix: false,
                withSuffix: true,
                globstar: false,
                flags: 'is'
            })
        }
        return pattern
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
        for (const pattern of this.patterns) {
            if (pattern.test(body)) {
                return next(request)
            }
        }
    }
}
