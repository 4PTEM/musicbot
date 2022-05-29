import { SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandNumberOption, SlashCommandStringOption } from '@discordjs/builders';
import { CacheType, Client, CommandInteraction, CommandInteractionOptionResolver } from 'discord.js';

export type CommandOptions = Omit<CommandInteractionOptionResolver<CacheType>, 'getMessage' | 'getFocused'>;
export type Option = {
    name: string;
    description: string;
    type: 'string' | 'boolean' | 'number' | 'integer';
    required: boolean;
};
export class Command {
    name: string;
    description: string;
    options: Option[];

    constructor(name: string, description: string, options: Option[], execute: (options: CommandOptions, interaction: CommandInteraction<'cached' | 'raw'>) => void) {
        this.name = name;
        this.execute = execute;
        this.description = description;
        this.options = options;
    }

    buildCommand() {
        const builder = new SlashCommandBuilder().setName(this.name).setNameLocalization('en-US', this.name).setDescription(this.description).setDescriptionLocalization('en-US', this.description);
        for (let option of this.options) {
            if (option.type === 'string') {
                builder.addStringOption(new SlashCommandStringOption().setName(option.name).setDescription(option.description).setRequired(option.required));
            } else if (option.type === 'boolean') {
                builder.addBooleanOption(new SlashCommandBooleanOption().setName(option.name).setDescription(option.description).setRequired(option.required));
            } else if (option.type === 'number') {
                builder.addNumberOption(new SlashCommandNumberOption().setName(option.name).setDescription(option.description).setRequired(option.required));
            } else if (option.type === 'integer') {
                builder.addIntegerOption(new SlashCommandIntegerOption().setName(option.name).setDescription(option.description).setRequired(option.required));
            }
        }
        return builder;
    }

    execute(options: CommandOptions, interaction: CommandInteraction<'cached' | 'raw'>): void {}
}

export class Handler {
    client: Client;
    commands: Map<string, Command>;
    queueLock = false;
    queue: { command: (options: CommandOptions, interaction: CommandInteraction<'cached' | 'raw'>) => void; options: CommandOptions; interaction: CommandInteraction<'cached' | 'raw'> }[] = [];

    constructor(client: Client, commands: Command[]) {
        this.client = client;
        this.commands = new Map();
        let existingCommands: Map<string, string> = new Map();
        client.application?.fetch().then(async (fetchedCommands) => {
            for (const [id, command] of fetchedCommands.commands.cache) {
                existingCommands.set(command.name, command.id);
            }
            for (const command of commands) {
                if (existingCommands.has(command.name)) {
                    existingCommands.delete(existingCommands.get(command.name)!);
                }
                //@ts-ignore
                client.application?.commands.create(command.buildCommand());
                this.commands.set(command.name, command);
            }
            for (const [name, id] of existingCommands) {
                if (!this.commands.has(name)) {
                    client.application?.commands.delete(id);
                }
            }
            setInterval(() => this.processQueue(), 300);
            console.log(`Bot is ready`);
        });
    }

    async processQueue(): Promise<void> {
        if (this.queueLock || this.queue.length == 0) return;
        this.queueLock = true;
        const { command, options, interaction } = this.queue.shift()!;
        await command(options, interaction);
        this.queueLock = false;
    }

    handleCommand(commandName: string, options: Omit<CommandInteractionOptionResolver, 'getMessage' | 'getFocused'>, interaction: CommandInteraction<'cached' | 'raw'>): void {
        const command = this.commands.get(commandName);
        if (!command) {
            interaction.reply({ content: 'command not found' });
            return;
        }
        this.queue.push({ command: command.execute, options, interaction });
    }
}
