import got from 'got'
import v1 from '..'

v1.command.register({
    events: ['chat-update-without-trigger'],
    whoCanUse: ['private'],
    handler: async (context) => {
        let response: { success: string } = await got
            .get('https://api.simsimi.net/v2/', {
                searchParams: {
                    text: context.message.trim(),
                    lc: 'id'
                }
            })
            .json()
        await context.reply({
            text: response.success
        })
    }
})
