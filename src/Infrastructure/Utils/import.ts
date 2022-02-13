import glob from 'glob'
import Logger, { deleteLoggerObject } from '../Logger'

/**
 * Import all files with glob pattern
 * @param globDir list of directories to search
 * @returns Promise<void>
 */
export const AutoImport =async (globDir: string[]) =>{
    let loggerName = 'Importing'
    let futures=await Promise.all(
        globDir.map(
            (location) =>
                new Promise((resolve, reject) => {
                    glob(location, (err, files) => {
                        if (err) {
                            Logger(loggerName).error(err.toString())
                            reject(err)
                            return
                        }
                        for (let file of files) {
                            import(file)
                            Logger(loggerName).debug(file)
                        }
                        resolve(true)
                    })
                })
        )
    )
    deleteLoggerObject(loggerName)
                return futures
}
