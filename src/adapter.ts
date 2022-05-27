import fetch from 'node-fetch'

type yandexTrack = {
    artists: [{ name: string }],
    title: string
}

function getParamsString(params: Record<string, any>) {
    let paramsString = '?';
    const entries = Object.entries(params);
    entries.forEach(row => {
        paramsString += `${row[0]}=${row[1]}&`
    });
    return paramsString.substring(0, paramsString.length - 1)
}

export class Adapter {
    async parseTracksFromYandexLink(link: string): Promise<string[]> {
        const linkregex = /^https\:\/\/music\.yandex\.ru\/users\/([^\/]*)\/playlists\/([0-9]*)$/;
        if(!linkregex.test(link)) return [];
        const match = [...link.match(linkregex)!];
        const owner = match[1];
        const playlist_id = match[2];
        let params = { owner, kinds: playlist_id };
        let paramsString = getParamsString(params);
        paramsString += '&light=true&madeFor=&withLikesCount=true&forceLogin=true&lang=ru&external-domain=music.yandex.ru&overembed=false&ncrnd=0.4617229546606778'
        let tracks = (await (await fetch(`https://music.yandex.ru/handlers/playlist.jsx${paramsString}`, {
            headers: {
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36 OPR/87.0.4390.25',
                'X-Current-UID': '693274689',
            }
        })).json()).playlist.tracks;
        tracks = tracks.map((track: yandexTrack) => {
            let author = track.artists.map((artist) => artist.name).join(', ');
            return author + ' - ' + track.title;
        });
        return tracks;
    }

    async parse(argsString: string): Promise<string[]> {
        if (argsString.startsWith('https://music.yandex.ru')) {
            return (await this.parseTracksFromYandexLink(argsString));
        }
        return [];
    }
}