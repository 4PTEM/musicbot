import { TextChannel } from 'discord.js';
import 'dotenv/config';
import { client } from './client';
import { commands } from './commands';
import { BOT_TOKEN } from './constants';
import { Handler } from './handler';

const handler = new Handler(client, commands);


client.on('messageCreate', async message => {
    if(!client.user) throw new Error('No client user');
    const { content, channel } = message;
    if (!channel.isText() || !(channel instanceof TextChannel)) return;
    if (!content.startsWith('+')) return;
    const commandMatch = content.match(/^\+([A-z0-9_-]*)/);
    if(!commandMatch) {
        message.channel.send({ content: 'command not found' });
        return;
    }
    const commandName = [...commandMatch][1];
    const argsStart = content.indexOf(' ');
    let argsString = content.substring(argsStart + 1);
    if(argsStart === -1) {
        argsString = '';
    }
    handler.handleCommand(commandName, argsString, message);
});

client.login(BOT_TOKEN);