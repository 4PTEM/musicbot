import { MusicQueue } from './musicQueue';

class MusicQueueManager {
    private queues: Map<string, MusicQueue>;

    public constructor() {
        this.queues = new Map();
    }

    public get(key: string) {
        return this.queues.get(key);
    }

    public set(key: string, queue: MusicQueue): MusicQueue {
        queue.setDestroyCallback(() => {
            this.queues.delete(key);
            console.log(`(MUSIC)[INFO] Musci queue ${key} deleted`);
        });
        this.queues.set(key, queue);
        return queue;
    }
}

export const musicQueueManager = new MusicQueueManager();