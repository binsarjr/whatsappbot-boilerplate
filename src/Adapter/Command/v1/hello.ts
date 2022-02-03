import v1 from '.'

v1.cmd.register({
    // pattern: /.testhai/is,
    events: ['chat-update-without-trigger'],
    handler: async ({ chat }) => {
        await v1.message.sendWithRead(chat.key, {
            text: 'Hai'
        })
    }
})
