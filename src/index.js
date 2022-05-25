const { Client, Intents } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const client = new Client({ intents: [Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES] });
const fetch = require('node-fetch');

function getParamsString(params) {
    let paramsString = '?';
    const entries = Object.entries(params);
    entries.forEach(row => {
        paramsString += `${row[0]}=${row[1]}&`
    });
    return paramsString.substring(0, paramsString.length - 1)
}

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const capybarki = client.guilds.cache.get('829020132268965949');
    const capygames = capybarki.channels.cache.get('829020132268965955');
    const owner = 'kukaraches48';
    const playlist_id = '3';
    let params = { owner, kinds: playlist_id };
    let paramsString = getParamsString(params);
    let tracks = (await (await fetch(`https://music.yandex.ru/handlers/playlist.jsx${paramsString}`)).json()).playlist.tracks;
    tracks = tracks.map((track) => {
        let author = '';
        track.artists.forEach((artist) => author += artist.name + ', ');
        return track.title + ' - ' + author;
    });
    for (const track of tracks) {
        const youtubeSearchResult = await (await fetch(`https://www.googleapis.com/youtube/v3/search?part=id&key=key&q=${encodeURI(track)}`)).json();
        const videoId = youtubeSearchResult.items[0].id.videoId;
        console.log('https://www.youtube.com/watch?v=' + videoId);
    }
    const track = createAudioResource(trackStream.body);
    const conn = joinVoiceChannel({ channelId: capygames.id, guildId: capybarki.id, adapterCreator: capygames.guild.voiceAdapterCreator });
    const player = createAudioPlayer();
    conn.subscribe(player);
    player.play(track);
});
client.login('');