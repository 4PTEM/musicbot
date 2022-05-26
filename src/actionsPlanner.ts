import { Client } from 'discord.js';
import moment from 'moment';

export interface PlannedAction {
    process(): void;
    remove: boolean;
}

export class EveryDayAction implements PlannedAction {
    time: string;
    timeformat: string;
    remove = false;

    constructor(time: string, execute: () => void, timeformat = 'HH:mm:ss') {
        this.time = time;
        this.execute = execute;
        this.timeformat = timeformat;
    }

    execute(): void {

    }

    process(): void {
        if (moment().format(this.timeformat) == this.time) {
            console.log(`executing everyday action time: ${this.time}`)
            this.execute();
        }
    }
}

export class ActionsPlanner {
    private actions: PlannedAction[];

    constructor() {
        this.actions = [];
        setInterval(() => this.processActions(), 1000);
    }

    addAction(action: PlannedAction) {
        this.actions.push(action);
    }

    processActions(): void {
        if (!this.actions) return;
        for (let i = 0; i < this.actions.length; i++) {
            const action = this.actions[i];
            action.process();
        }
    }
}