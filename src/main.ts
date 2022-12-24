import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import { commands } from './commands';
import { BOT_TOKEN } from './constants';
import { Handler } from './handler';

const client = new Client({ intents: [GatewayIntentBits.GuildMembers, GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages] });

client.on('ready', async (client) => {
    if (!client.user) throw new Error('authentication error');
    console.log(`Logged in as ${client.user.tag}!`);
    const handler = new Handler(client);
    await handler.initCommands(commands);

    client.on('interactionCreate', async (interaction) => {
        if (!client.user) throw new Error('No client user');
        const { channel } = interaction;
        if (!channel || !interaction.guild || !interaction.channel || !interaction.isCommand() || !interaction.inGuild()) {
            console.log('Bad interaction');
            return;
        }
        handler.handleCommand(interaction.commandName, interaction);
    });
});

client.login(BOT_TOKEN);
