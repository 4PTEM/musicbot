import moment from 'moment';

export interface PlannedAction {
    process(): void;
    remove: boolean;
}

export class EveryDayAction implements PlannedAction {
    private time: string;
    private timeformat: string;
    public remove = false;

    public constructor(time: string, execute: () => void, timeformat = 'HH:mm:ss') {
        this.time = time;
        this.execute = execute;
        this.timeformat = timeformat;
    }

    private execute(): void {}

    public process(): void {
        if (moment().format(this.timeformat) == this.time) {
            console.log(`(ACTIONS)[INFO]executing everyday action time: ${this.time}`);
            this.execute();
        }
    }
}

export class ActionsPlanner {
    private actions: PlannedAction[];

    public constructor() {
        this.actions = [];
        setInterval(() => this.processActions(), 1000);
    }

    public addAction(action: PlannedAction) {
        this.actions.push(action);
    }

    private processActions(): void {
        if (!this.actions) return;
        for (let i = 0; i < this.actions.length; i++) {
            const action = this.actions[i];
            action.process();
        }
    }
}