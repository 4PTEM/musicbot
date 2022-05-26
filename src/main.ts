import { TextChannel } from 'discord.js'
import { Handler } from './handler';
import { client } from './client';
import { commands } from './commands';
import { BOT_TOKEN } from './config';

const handler = new Handler(client, commands);

client.on('messageCreate', async message => {
    const { content, channel } = message;
    if(!channel.isText() || !(channel instanceof TextChannel)) return;
    if(content.startsWith('+')){
        const commandName = content.substring(1, content.indexOf(' '));
        const argsString = content.substring(content.indexOf(' ') + 1);
        handler.handleCommand(commandName, argsString, message);
    }
});

client.login(BOT_TOKEN);