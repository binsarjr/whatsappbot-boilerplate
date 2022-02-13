import v1 from '..'

v1().command.register({
    events: ['chat-update-without-trigger'],
    whoCanUse: ['dev'],
    handler: async (context) => {
        await context.replyAsPrivate({
            text: context.message
        })
    }
})
