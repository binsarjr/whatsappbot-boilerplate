import Logger from '@ptkdev/logger'

class MyLogger extends Logger {
    trace(message: string, tag?: string) {
        super.debug(message, `Trace => ${tag}`)
    }
    warn(message: string, tag?: string) {
        super.warning(message, tag)
    }
}

export default new MyLogger()
