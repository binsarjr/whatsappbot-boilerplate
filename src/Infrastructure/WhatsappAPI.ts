import makeWASocket, {
    BaileysEventEmitter,
    DisconnectReason,
    LegacySocketConfig,
    makeInMemoryStore,
    makeWALegacySocket,
    SocketConfig,
    useSingleFileAuthState,
    useSingleFileLegacyAuthState,
    WALegacySocket,
    WASocket
} from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'
import { existsSync, unlinkSync } from 'fs'
import path from 'path'
import { mkdirIfNotExists } from './Utils/files'

interface WAPIOptions {
    session_file: string
}
function sessionFile(filename: string) {
    let storePath = path.join(__dirname, '../..', '.sessions', filename)
    mkdirIfNotExists(storePath)
    return storePath
}

function memoryStore(filename: string) {
    let store = makeInMemoryStore({})
    store.readFromFile(filename)
    // save every 10s
    setInterval(() => {
        store.writeToFile(filename)
    }, 10_000)
    return store
}

export const WhatsappLegacy = (options: {
    name: string
    config: Partial<LegacySocketConfig>
    sockets: ((sock: WALegacySocket) => void)[]
    events: ((ev: BaileysEventEmitter) => void)[]
}) => {
    let { name, config, events, sockets } = options
    name = name.replace(/\.json$/is, '')
    let storePath = sessionFile(`legacy/${name}-baileys_store.json`)
    let store = memoryStore(storePath)
    const sessinoPath = sessionFile('legacy/' + name + '.json')
    const { state, saveState } = useSingleFileLegacyAuthState(sessinoPath)
    config.auth = state
    let socket = makeWALegacySocket(config)
    store.bind(socket.ev)
    events.forEach((b) => b(socket.ev))
    sockets.forEach((sock) => sock(socket))

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            // reconnect if not logged out
            if (
                (lastDisconnect!.error as Boom)?.output?.statusCode !==
                DisconnectReason.loggedOut
            ) {
                socket = WhatsappLegacy({
                    name,
                    config,
                    sockets,
                    events
                }).socket
            } else {
                existsSync(storePath) && unlinkSync(storePath)
                existsSync(sessinoPath) && unlinkSync(sessinoPath)
                throw new Error('logged out')
            }
        }

        console.log('connection update', update)
    })

    socket.ev.on('creds.update', saveState)

    return { socket, store }
}

export const WhatsappMultiDevice = (options: {
    name: string
    config: Partial<SocketConfig>
    sockets: ((sock: WASocket) => void)[]

    events: ((ev: BaileysEventEmitter) => void)[]
}) => {
    let { name, config, events, sockets } = options
    name = name.replace(/\.json$/is, '')
    let storePath = sessionFile(`multidevice/${name}-baileys_store_multi.json`)
    let store = memoryStore(storePath)
    const sessionPath = sessionFile('multidevice/' + name + '.json')
    const { state, saveState } = useSingleFileAuthState(sessionPath)
    config.auth = state
    let socket = makeWASocket(config)
    store.bind(socket.ev)
    sockets.forEach((sock) => sock(socket))
    events.forEach((bind) => bind(socket.ev))

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            // reconnect if not logged out
            if (
                (lastDisconnect!.error as Boom)?.output?.statusCode !==
                DisconnectReason.loggedOut
            ) {
                socket = WhatsappMultiDevice({
                    name,
                    config,
                    events,
                    sockets
                }).socket
            } else {
                existsSync(storePath) && unlinkSync(storePath)
                existsSync(sessionPath) && unlinkSync(sessionPath)
                console.log('connection closed')
            }
        }

        console.log('connection update', update)
    })

    socket.ev.on('creds.update', saveState)

    return {
        socket,
        store
    }
}
