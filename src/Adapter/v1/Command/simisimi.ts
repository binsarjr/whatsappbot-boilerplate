import got from 'got'
import v1 from '..'

v1.cmd.register({
    events: ['chat-update'],
    pattern: /.*/is,
    whoCanUse: ['private'],
    handler: async ({ chat, message }) => {
        let response: { success: string } = await got
            .get('https://api.simsimi.net/v2/', {
                searchParams: {
                    text: message.trim(),
                    lc: 'id'
                }
            })
            .json()
        await v1.message.sendWithRead(chat.key, {
            text: response.success
        })
    }
})
