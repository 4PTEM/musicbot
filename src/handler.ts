import { Client, Message} from 'discord.js';

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

    constructor(client: Client, commands: Command[]) {
        this.client = client;
        this.commands = new Map()
        for (const command of commands) {
            this.commands.set(command.name, command)
        }
    }

    handleCommand(commandName: string, argsString: string, message: Message): void {
        const command = this.commands.get(commandName);
        if(!command) {
            message.channel.send({content: 'command not found'});
            return;
        }
        command.execute(argsString, message);
    }
}