import glob from 'glob'
import Logger from '../Logger'

/**
 * Import all files with glob pattern
 * @param globDir list of directories to search
 * @returns Promise<void>
 */
export const AutoImport = (globDir: string[]) =>
    Promise.all(
        globDir.map(
            (location) =>
                new Promise((resolve, reject) => {
                    glob(location, (err, files) => {
                        if (err) {
                            Logger.error(err.toString())
                            reject(err)
                            return
                        }
                        for (let file of files) {
                            import(file)
                            Logger.debug(file, 'Importing')
                        }
                        resolve(true)
                    })
                })
        )
    )
