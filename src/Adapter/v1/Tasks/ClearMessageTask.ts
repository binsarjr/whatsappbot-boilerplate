import { scheduleJob } from 'node-schedule'
import v1 from '..'
import { isProducation } from '../../../Infrastructure/Utils/validate'

if (isProducation()) {
    scheduleJob(
        'clearAllMessage',
        {
            rule: '0 0 * * * *',
            tz: 'Asia/Jakarta'
        },
        async () => {
            await v1.clear()
        }
    )
}
