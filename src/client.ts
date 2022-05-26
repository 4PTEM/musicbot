import { Client, Intents } from 'discord.js'

const client = new Client({ intents: [Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES] });

client.on('ready', async () => {
    if (!client.user) throw new Error('authentication error');
    console.log(`Logged in as ${client.user.tag}!`);
});

export { client };