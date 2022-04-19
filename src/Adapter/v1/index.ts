import CallmeBuddy from '../../Commands/CallmeBuddy'
import GroupCommand from '../../Commands/GroupCommand'
import PrivateCommand from '../../Commands/PrivateCommand'
import Invoker from '../../Infrastructure/Invoker'
import WABOT from '../../Infrastructure/WABOT'
import AccessOn from '../../Middlewares/AccessOn'
import CallmeParse from '../../Middlewares/CallmeParse'
import Pattern from '../../Middlewares/Pattern'

let v1: WABOT | null = null

export default () => {
    if (v1) return v1
    v1 = new WABOT({
        name: process.env.BOTNAME!,
        config: {
            printQRInTerminal: true
        }
    })

    const invoker = new Invoker()
    const privateOnly = invoker.use(new AccessOn('private'))
    const groupOnly = invoker.use(new AccessOn('group'))

    // /hello
    privateOnly.use(new Pattern('hello')).onMessage(new PrivateCommand())

    // /hello
    groupOnly.use(new Pattern('hello')).onMessage(new GroupCommand())

    // /callme yourName
    invoker
        .use(new Pattern('callme*'), new CallmeParse())
        .onMessage(new CallmeBuddy())

    v1.addSocketBinding((s) => invoker.bind(s))
    return v1
}
