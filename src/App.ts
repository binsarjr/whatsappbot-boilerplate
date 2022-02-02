import { config } from 'dotenv'
import path from 'path'
import Command from './Infrastructure/Command'
import Message from './Infrastructure/Message'
import { AutoImport } from './Infrastructure/Utils/import'
import { WhatsappLegacy } from './Infrastructure/WhatsappAPI'

config()

async function start() {
    WhatsappLegacy({
        name: 'Bot Test hehe',
        config: { printQRInTerminal: true },
        sockets: [Message.bind],
        events: [Command.bind]
    })
    // WhatsappMultiDevice({
    //     name: 'bot test md',
    //     config: {
    //         printQRInTerminal: true
    //     },
    //     sockets: [Message.bind],
    //     events: [Command.bind]
    // })
}

;(async () => {
    // initial load

    let autoImportDir = [
        path.join(__dirname, './Adapter/Tasks/**/*(*.ts|*.js)'),
        path.join(__dirname, './Adapter/Command/**/*(*.ts|*.js)')
    ]
    await AutoImport(autoImportDir)
    await start()
    process.on('uncaughtException', function (err) {
        if (
            err.toString().includes('getaddrinfo') ||
            err.toString().includes('logged out')
        ) {
            start()
        } else throw err
    })
})()
