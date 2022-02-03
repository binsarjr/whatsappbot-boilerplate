import { config } from 'dotenv'
import path from 'path'
import bot from './Adapter/v1'
import { AutoImport } from './Infrastructure/Utils/import'

config()

async function start() {
    bot.start()
}

;(async () => {
    // initial load

    let autoImportDir = [
        path.join(__dirname, './Adapter/*/Tasks/**/*(*.ts|*.js)'),
        path.join(__dirname, './Adapter/*/Command/**/*(*.ts|*.js)')
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
