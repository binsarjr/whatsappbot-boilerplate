import fs from 'fs'
import path from 'path'

export function mkdirIfNotExists(filepath: string) {
    if (!fs.existsSync(filepath)) {
        let dir = path.dirname(filepath)
        fs.mkdirSync(dir, { recursive: true })
    }
}
