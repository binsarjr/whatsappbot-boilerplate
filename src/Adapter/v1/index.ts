import WABOT from '../../Infrastructure/WABOT'

let v1: WABOT | null = null

export default (() => {
    if (v1) return v1
    v1 = new WABOT({
        name: process.env.BOTNAME!,
        config: {
            printQRInTerminal: true
        }
    })
    return v1
})()
