import { Client, Intents, MessageAttachment } from 'discord.js';
import 'dotenv/config';
import * as fs from 'fs';
import { ActionsPlanner, EveryDayAction } from './actionsPlanner';
import { commands } from './commands';
import { BOT_TOKEN } from './constants';
import { Handler } from './handler';

const client = new Client({ intents: [Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES] });

client.on('ready', async () => {
    if (!client.user) throw new Error('authentication error');
    console.log(`Logged in as ${client.user.tag}!`);
    const actionsPlanner = new ActionsPlanner();
    actionsPlanner.addAction(
        new EveryDayAction('07:00:00', async () => {
            const sashachat = await client.users.createDM('678313025161396245');
            const photo = new MessageAttachment(fs.readFileSync('./images/goodMorningSasha.jpg'), 'good_morning.jpg');
            sashachat.send({
                files: [photo],
            });
        })
    );
    const handler = new Handler(client, commands);
    client.on('interactionCreate', async (interaction) => {
        if (!client.user) throw new Error('No client user');
        const { channel } = interaction;
        if (!channel || !interaction.guild || !interaction.channel || !interaction.isCommand() || !interaction.inGuild()) return;
        handler.handleCommand(interaction.commandName, interaction.options, interaction);
    });
});

client.login(BOT_TOKEN);
