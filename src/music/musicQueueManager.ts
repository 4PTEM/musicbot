import { MusicQueue } from './musicQueue';

export class MusicQueueManager {
    queues: Map<string, MusicQueue>;

    constructor() {
        this.queues = new Map();
    }

    get(key: string) {
        return this.queues.get(key);
    }

    set(key: string, queue: MusicQueue): MusicQueue {
        this.queues.set(key, queue);
        return queue;
    }
}
