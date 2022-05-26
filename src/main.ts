import { TextChannel } from 'discord.js';
import 'dotenv/config';
import { client } from './client';
import { commands } from './commands';
import { Handler } from './handler';

const handler = new Handler(client, commands);


client.on('messageCreate', async message => {
    const { content, channel } = message;
    if (!channel.isText() || !(channel instanceof TextChannel)) return;
    if (content.startsWith('+')) {
        const commandName = content.substring(1, content.indexOf(' '));
        const argsString = content.substring(content.indexOf(' ') + 1);
        handler.handleCommand(commandName, argsString, message);
    }
});

client.login(process.env.BOT_TOKEN);