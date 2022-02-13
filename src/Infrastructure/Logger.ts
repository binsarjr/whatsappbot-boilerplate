import pino from 'pino'

let loggers: { [k: string]: pino.Logger } = {}

export const deleteLoggerObject = (name: string) => delete loggers[name]

export default (name: string = 'WhatsappBot', options?: pino.LoggerOptions) => {
    if (!loggers[name]) {
        loggers[name] = pino({
            ...{
                name: name,
                level: 'trace'
            },
            ...options
        })
    }
    return loggers[name]
}
