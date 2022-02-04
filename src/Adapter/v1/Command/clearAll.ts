import v1 from '..'

v1.cmd.register({
    pattern: /\.clear/is,
    events: ['chat-update'],
    handler: async ({ chat }) => {
        await v1.clearMessageAll()
        await v1.message.sendWithRead(chat.key, {
            text: 'Sudah pak'
        })
    }
})
