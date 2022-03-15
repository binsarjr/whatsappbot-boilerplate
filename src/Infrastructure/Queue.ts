import { delay } from '@adiwajshing/baileys'
import PQueue, { DefaultAddOptions, Options } from 'p-queue'
import PriorityQueue from 'p-queue/dist/priority-queue'
class Queue {
    static instance: Queue
    static getInstance(): Queue {
        if (!Queue.instance) {
            Queue.instance = new Queue()
        }
        return Queue.instance
    }

    queues: { [key: string]: PQueue } = {}

    with(key: string, options?: Options<PriorityQueue, DefaultAddOptions>) {
        if (!this.queues[key]) {
            this.queues[key] = new PQueue(options)
        }
        return this.queues[key]
    }

    async waitUntilDone(key: string) {
        while (this.queues[key].pending) {
            await delay(100)
        }
    }

    async waitAllUntilDone() {
        await Promise.all(
            Object.keys(this.queues).map((key) => this.waitUntilDone(key))
        )
        this.queues = {}
    }
}

export default Queue.getInstance()
