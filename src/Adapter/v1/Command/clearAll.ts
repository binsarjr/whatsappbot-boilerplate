import v1 from '..'

v1.cmd.register({
    pattern: /\.clear/is,
    events: ['chat-update'],
    handler: async ({ chat }) => {
        v1.store.clearAll()
        await v1.message.sendWithRead(chat.key, {
            text: 'Sudah pak'
        })
    }
})
