import { Client, Intents, MessageAttachment } from 'discord.js';
import 'dotenv/config';
import { commands } from './commands';
import { BOT_TOKEN } from './constants';
import { Handler } from './handler';

const client = new Client({ intents: [Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES] });

client.on('ready', async () => {
    await client.application?.commands.fetch();
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
        handler.handleCommand(interaction.commandName, interaction.options, interaction);
    });
});

client.login(BOT_TOKEN);
