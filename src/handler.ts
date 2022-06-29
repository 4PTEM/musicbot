import { SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandNumberOption, SlashCommandOptionsOnlyBuilder, SlashCommandStringOption } from '@discordjs/builders';
import { ApplicationCommand, CacheType, Client, CommandInteraction, CommandInteractionOptionResolver } from 'discord.js';
import { LocaleString } from './locale';

export type CommandOptions = Omit<CommandInteractionOptionResolver<CacheType>, 'getMessage' | 'getFocused'>;
export type Option = {
    name: string;
    description: Description;
    type: 'STRING' | 'BOOLEAN' | 'NUMBER' | 'INTEGER';
    required: boolean;
};

export type Description = {
    default: string,
    localizations: { [k in LocaleString]?: string }
}

export type CommandOption = SlashCommandStringOption | SlashCommandBooleanOption | SlashCommandNumberOption | SlashCommandIntegerOption;

function addDescriptionLocalizations(commandOption: CommandOption | SlashCommandBuilder, description: Description) {
    for (const [locale, localization] of Object.entries(description.localizations)) {
        commandOption.setDescriptionLocalization(locale as LocaleString, localization);
    }
}

export class Command {
    public name: string;
    public description: Description;
    public options: Option[];

    public constructor(name: string, description: Description, options: Option[], execute: (options: CommandOptions, interaction: CommandInteraction<'cached' | 'raw'>) => void) {
        this.name = name;
        this.execute = execute;
        this.description = description;
        this.options = options;
    }

    public buildCommand() {
        const builder = new SlashCommandBuilder().setName(this.name).setDescription(this.description.default);
        for (let option of this.options) {
            let commandOption: CommandOption;
            if (option.type === 'STRING') {
                commandOption = new SlashCommandStringOption().setName(option.name).setDescription(option.description.default).setRequired(option.required);
                addDescriptionLocalizations(commandOption, this.description);
                builder.addStringOption(commandOption);
            } else if (option.type === 'BOOLEAN') {
                commandOption = new SlashCommandBooleanOption().setName(option.name).setDescription(option.description.default).setRequired(option.required);
                addDescriptionLocalizations(commandOption, this.description);
                builder.addBooleanOption(commandOption);
            } else if (option.type === 'NUMBER') {
                let commandOption = new SlashCommandNumberOption().setName(option.name).setDescription(option.description.default).setRequired(option.required);
                addDescriptionLocalizations(commandOption, this.description);
                builder.addNumberOption(commandOption);
            } else if (option.type === 'INTEGER') {
                let commandOption = new SlashCommandIntegerOption().setName(option.name).setDescription(option.description.default).setRequired(option.required);
                addDescriptionLocalizations(commandOption, this.description);
                builder.addIntegerOption(commandOption);
            }
        }
        return builder;
    }

    public equalsTo(command: ApplicationCommand): boolean {
        if (this.options.length != command.options.length || this.name != command.name || this.description.default != command.description) {
            return false;
        }
        for (let { name, type, description } of this.options) {
            if (!command.options.some((option) => option.name == name && option.type == type && option.description == description.default)) {
                return false;
            }
        }
        return true;
    }

    public execute(options: CommandOptions, interaction: CommandInteraction<'cached' | 'raw'>): void { }
}

export class Handler {
    private client: Client;
    private commands: Map<string, Command>;
    private queueLock = false;
    private queue: { command: (options: CommandOptions, interaction: CommandInteraction<'cached' | 'raw'>) => void; options: CommandOptions; interaction: CommandInteraction<'cached' | 'raw'> }[] = [];

    public constructor(client: Client) {
        this.client = client;
        if (!client.application) {
            throw new Error('Bad client');
        }
        this.commands = new Map();
        setInterval(() => this.processQueue(), 300);
    }

    public async initCommands(commands: Command[]): Promise<void> {
        const clientCommands = this.client.application!.commands.cache;
        let commandsUpdatingProcess: Promise<void> | undefined;
        if (commands.length != clientCommands.size) {
            commandsUpdatingProcess = this.updateApplicationCommands(commands);
        }
        for (const command of commands) {
            if (!commandsUpdatingProcess && !clientCommands.some((clientCommand) => command.equalsTo(clientCommand))) {
                commandsUpdatingProcess = this.updateApplicationCommands(commands);
            }
            this.commands.set(command.name, command);
        }
        await commandsUpdatingProcess;
        console.log('(HANDLER)[INFO] Commands initialized');
    }

    private async updateApplicationCommands(commands: Command[]): Promise<void> {
        console.log('(HANDLER)[INFO] Updating application commands list');
        const commandCreationRequests: Promise<ApplicationCommand>[] = [];
        const oldCommandsIds = this.client.application!.commands.cache.map((command) => command.id);
        for (const command of commands) {
            //@ts-ignore
            commandCreationRequests.push(this.client.application.commands.create(command.buildCommand()));
        }
        const createdCommands = await Promise.all(commandCreationRequests);
        const createdCommandsIds = createdCommands.map((command) => command.id);
        oldCommandsIds.forEach((id) => {
            if (!createdCommandsIds.includes(id)) {
                this.client.application?.commands.delete(id);
            }
        });
    }

    private async processQueue(): Promise<void> {
        if (this.queueLock || this.queue.length == 0) return;
        this.queueLock = true;
        const { command, options, interaction } = this.queue.shift()!;
        await command(options, interaction);
        this.queueLock = false;
    }

    public handleCommand(commandName: string, options: Omit<CommandInteractionOptionResolver, 'getMessage' | 'getFocused'>, interaction: CommandInteraction<'cached' | 'raw'>): void {
        const command = this.commands.get(commandName);
        if (!command) {
            interaction.reply({ content: 'command not found' });
            return;
        }
        this.queue.push({ command: command.execute, options, interaction });
    }
}
