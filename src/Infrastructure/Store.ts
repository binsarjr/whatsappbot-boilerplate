import { BaileysEventEmitter, makeInMemoryStore } from '@adiwajshing/baileys'
import fs from 'fs'
import path from 'path'

export default class Store {
    memory = makeInMemoryStore({})
    filepath: string
    constructor(filepath: string) {
        this.filepath = Store.sessionFile(filepath)
    }
    static sessionFile(filename: string, dir: string = '.sessions') {
        return path.join(dir, filename)
    }

    public mkdirIfNotExists(filepath: string) {
        if (!fs.existsSync(filepath)) {
            let dir = path.dirname(filepath)
            fs.mkdirSync(dir, { recursive: true })
        }
    }
    public bind(ev: BaileysEventEmitter) {
        this.memory.bind(ev)
    }
    public saving(intervalMs: number = 10_000) {
        this.mkdirIfNotExists(this.filepath)
        this.memory.readFromFile(this.filepath)
        setInterval(() => {
            this.memory.writeToFile(this.filepath)
        }, intervalMs)
    }
    public delete() {
        return fs.existsSync(this.filepath) && fs.unlinkSync(this.filepath)
    }
}
