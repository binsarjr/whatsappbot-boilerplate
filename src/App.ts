import { config } from 'dotenv'
import path from 'path'
import v1 from './Adapter/v1'
import { AutoImport } from './Infrastructure/Utils/import'
import { isProducation } from './Infrastructure/Utils/validate'
config()


async function start() {
    v1().start()
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
        if (isProducation()) return start()
        if (
            err.toString().includes('getaddrinfo') ||
            err.toString().includes('logged out')
        ) {
            start()
        } else throw err
    })
})()
