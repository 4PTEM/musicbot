import { ApplicationCommand, Client, Collection, CommandInteraction, CommandInteractionOptionResolver, REST, Routes } from 'discord.js';
import { Command } from './commands/types';
import Bottleneck from 'bottleneck';
import { BOT_TOKEN } from './constants';

export class Handler {
    private client: Client<true>;
    private commands: Map<string, Command>;
    private queue = new Bottleneck();

    public constructor(client: Client) {
        this.client = client;
        if (!client.application) {
            throw new Error('Bad client');
        }
        this.commands = new Map();
    }

    public async initCommands(commands: Command[]): Promise<void> {
        const rest = new REST({ version: '10' }).setToken(BOT_TOKEN!);
        try {
            console.log('(HANDLER)[INFO] Initialazing commands');
            await rest.put(Routes.applicationCommands(this.client.application.id), { body: commands });
            console.log('(HANDLER)[INFO] Commands initialized');
        } catch (error) {
            console.log(error);
        }
    }

    public handleCommand(commandName: string, interaction: CommandInteraction<'cached' | 'raw'>): void {
        const command = this.commands.get(commandName);
        if (!command) {
            interaction.reply({ content: 'command not found' });
            return;
        }
        this.queue.schedule(async () => {
            command.execute(interaction);
        });
    }
}