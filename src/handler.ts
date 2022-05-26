import { Client, Message } from 'discord.js';

export class Command {
    name: string;

    constructor(name: string, execute: (argsString: string, message: Message) => void) {
        this.name = name;
        this.execute = execute;
    }

    execute(argsString: string, message: Message): void { }
}

export class Handler {
    client: Client;
    commands: Map<string, Command>;
    queueLock = false;
    queue: {command: ((argsString: string, message: Message) => void), argsString: string, message: Message}[] = [];

    constructor(client: Client, commands: Command[]) {
        this.client = client;
        this.commands = new Map()
        for (const command of commands) {
            this.commands.set(command.name, command)
        }
        setInterval(() => this.processQueue(), 300);
    }

    async processQueue(): Promise<void> {
        if(this.queueLock || this.queue.length == 0) return;

        this.queueLock = true;
        const { command, argsString, message } = this.queue.shift()!;
        await command(argsString, message);
        this.queueLock = false;
    }

    handleCommand(commandName: string, argsString: string, message: Message): void {
        const command = this.commands.get(commandName);
        if (!command) {
            message.channel.send({ content: 'command not found' });
            return;
        }
        this.queue.push({command: command.execute, argsString, message});
    }
}