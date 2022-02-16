interface Glob2RegexConfig {
    /**
     * Whether we are matching so called "extended" globs (like bash) and should
     * support single character matching, matching ranges of characters, group
     * matching, etc.
     */
    extended: boolean
    /**
     * When globstar is _false_ (default), `/foo/*` is translated a regexp like
     * `^\/foo\/.*$` which will match any string beginning with `/foo/`
     * When globstar is _true_, `/foo/*` is translated to regexp like
     * `^\/foo\/[^/]*$` which will match any string beginning with `/foo/` BUT
     * which does not have a `/` to the right of it.
     * E.g. with `/foo/*` these will match: `/foo/bar`, `/foo/bar.txt` but
     * these will not `/foo/bar/baz`, `/foo/bar/baz.txt`
     * Lastely, when globstar is _true_, `/foo/**` is equivelant to `/foo/*` when
     * globstar is _false_
     */
    globstar: boolean
    flags: string
}

export function glob2regex(
    glob: string,
    opts: Partial<Glob2RegexConfig> = {
        extended: true,
        globstar: false,
        flags: 'is'
    }
) {
    if (typeof glob !== 'string') {
        throw new TypeError('Expected a string')
    }

    let str = String(glob)

    // The regexp we are building, as a string.
    let reStr = ''

    let extended = opts ? !!opts.extended : false

    let globstar = opts ? !!opts.globstar : false

    // If we are doing extended matching, this boolean is true when we are inside
    // a group (eg {*.html,*.js}), and false otherwise.
    let inGroup = false

    // RegExp flags (eg "i" ) to pass in to RegExp constructor.
    let flags = opts && typeof opts.flags === 'string' ? opts.flags : ''

    let c
    for (let i = 0, len = str.length; i < len; i++) {
        c = str[i]

        switch (c) {
            case '/':
            case '$':
            case '^':
            case '+':
            case '.':
            case '=':
            case '!':
            case '|':
                reStr += '\\' + c
                break

            case '?':
                if (extended) {
                    reStr += '.'
                    break
                }

            case '[':
            case ']':
                if (extended) {
                    reStr += c
                    break
                }

            case '(':
                if (extended) {
                    inGroup = true
                    reStr += '('
                    break
                } else reStr += '\\('

            case ')':
                if (extended) {
                    inGroup = false
                    reStr += ')'
                    break
                } else reStr += '\\)'
            case '{':
                if (extended) {
                    reStr += '{'
                    break
                }

            case '}':
                if (extended) {
                    reStr += '}'
                    break
                }

            case ',':
                if (inGroup) {
                    reStr += '|'
                    break
                } else if (extended) {
                    reStr += c
                } else {
                    reStr += '\\' + c
                }
                break

            case '*':
                // Move over all consecutive "*"'s.
                // Also store the previous and next characters
                let prevChar = str[i - 1]
                let starCount = 1
                while (str[i++ + 1] === '*') {
                    starCount++
                    i++
                }
                let nextChar = str[i + 1]

                if (!globstar) {
                    // globstar is disabled, so treat any number of "*" as one
                    reStr += '.*'
                } else {
                    // globstar is enabled, so determine if this is a globstar segment
                    let isGlobstar =
                        starCount > 1 && // multiple "*"'s
                        (prevChar === '/' || prevChar === undefined) && // from the start of the segment
                        (nextChar === '/' || nextChar === undefined) // to the end of the segment

                    if (isGlobstar) {
                        // it's a globstar, so match zero or more path segments
                        reStr += '((?:[^/]*(?:/|$))*)'
                        i++ // move over the "/"
                    } else {
                        // it's not a globstar, so only match one path segment
                        reStr += '([^/]*)'
                    }
                }
                break

            default:
                reStr += c
        }
    }

    // When regexp 'g' flag is specified don't
    // constrain the regular expression with ^ & $
    if (!flags || !~flags.indexOf('g')) {
        reStr = '^' + reStr + '$'
    }

    return new RegExp(reStr, flags)
}
