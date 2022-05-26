import { Client, Intents, MessageAttachment, MessagePayload } from 'discord.js'
import { ActionsPlanner, EveryDayAction } from './actionsPlanner';
import * as fs from 'fs';
import moment from 'moment';

const client = new Client({ intents: [Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES] });

client.on('ready', async () => {
    if (!client.user) throw new Error('authentication error');
    console.log(`Logged in as ${client.user.tag}!`);
    const actionsPlanner = new ActionsPlanner();
    const time = moment(new Date(new Date().getTime() + 2000)).format('HH:mm:ss');
    actionsPlanner.addAction(new EveryDayAction('07:00:00', async () => {
        const sashachat = await client.users.createDM('678313025161396245');
        const photo = new MessageAttachment(fs.readFileSync('./images/goodMorningSasha.jpg'), 'good_morning.jpg');
        sashachat.send({
            files: [photo]
        })
    }))
});

export { client };