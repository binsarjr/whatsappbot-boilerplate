import {
    AuthenticationState,
    GroupParticipant,
    isJidGroup,
    proto,
    useSingleFileAuthState,
    WASocket
} from '@adiwajshing/baileys'
import { getParticipants, getPersonalJid } from './Supports/messages'
import Store from './Store'
import { CommandUserType } from './Types/Command'

export default class Auth {
    state: AuthenticationState
    store: Store
    saveState: () => void
    constructor(filepath: string) {
        this.store = new Store({ filepath })
        let { saveState, state } = useSingleFileAuthState(this.store.filepath)
        this.state = state
        this.saveState = saveState
    }
    static async authorization(
        socket: WASocket,
        whoCanUse: CommandUserType[],
        chat: proto.IWebMessageInfo
    ): Promise<boolean> {
        if (whoCanUse) {
            if (whoCanUse.includes('all')) return true

            const jid = chat.key.remoteJid || ''
            const participant = getPersonalJid(chat)

            if (whoCanUse.includes('private') && !isJidGroup(jid)) return true

            if (whoCanUse.includes('group') && isJidGroup(jid)) return true

            if (
                whoCanUse.includes('dev') &&
                participant === process.env.DEV_JID
            )
                return true

            let participants: GroupParticipant[] = []
            isJidGroup(jid) &&
                (participants = await getParticipants(socket, chat, 'all'))

            if (whoCanUse.includes('admin')) {
                let admins = await getParticipants(
                    socket,
                    participants,
                    'admin'
                )
                admins = admins.filter((admin) => admin.id == participant)

                return Boolean(admins.length)
            }
            if (whoCanUse.includes('member')) {
                let members = await getParticipants(
                    socket,
                    participants,
                    'member'
                )
                members = members.filter((member) => member.id == participant)
                return Boolean(members.length)
            }
        }
        return false
    }
}
