import fetch, { Response } from 'node-fetch';
import { YANDEX_COOKIE } from './constants';
import { BaseTrack, Track, YoutubeTrack } from './music/track';
import { youTubeParser } from './youtubeDataAPI/ytParser';

type yandexTrack = {
    id: string;
    realId: string;
    artists: [{ name: string }];
    title: string;
};

function getParamsString(params: Record<string, any>) {
    let paramsString = '?';
    const entries = Object.entries(params);
    entries.forEach((row) => {
        paramsString += `${row[0]}=${row[1]}&`;
    });
    return paramsString.substring(0, paramsString.length - 1);
}

export interface BasePlatformAdapter {
    parse(argsString: string): Promise<BaseTrack[]> | Track[];
}

export class YandexAdapter implements BasePlatformAdapter {
    private linkRegex = /^https:\/\/music\.yandex\.ru\/users\/([^/]*)\/playlists\/([0-9]*)$/;
    private albumRegex = /^https:\/\/music\.yandex\.ru\/album\/([^/]*)$/;
    private trackRegex = /^https:\/\/music\.yandex\.ru\/album\/([^/]*)\/track\/([0-9]*)$/;
    private lastVisit = Date.now() / 1000;

    public async parse(argsString: string): Promise<BaseTrack[]> {
        if (this.linkRegex.test(argsString)) {
            const match = [...argsString.match(this.linkRegex)!];
            const owner = match[1];
            const playlist_id = match[2];
            return await this.parsePlaylist(owner, playlist_id);
        } else if (this.albumRegex.test(argsString)) {
            const match = [...argsString.match(this.albumRegex)!];
            const albumId = match[1];
            return await this.parseAlbum(albumId);
        } else if (this.trackRegex.test(argsString)) {
            const match = [...argsString.match(this.trackRegex)!];
            const [, albumId, trackId] = match;
            return await this.parseTrack(albumId, trackId);
        }
        return [];
    }

    private async parseAlbum(albumId: string): Promise<BaseTrack[]> {
        let paramsString = `?album=${albumId}`;
        paramsString += '&lang=ru&external-domain=music.yandex.ru&overembed=false&ncrnd=0.38299750155576406';
        const tracks = (await (await this.request(`https://music.yandex.ru/handlers/album.jsx${paramsString}`)).json()).volumes[0] as yandexTrack[];
        return this.getTracksFromYandexTracks(tracks);
    }

    private async parseTrack(albumId: string, trackId: string): Promise<BaseTrack[]> {
        let paramsString = `?album=${albumId}`;
        paramsString += '&lang=ru&external-domain=music.yandex.ru&overembed=false&ncrnd=0.38299750155576406';
        const tracks = (await (await this.request(`https://music.yandex.ru/handlers/album.jsx${paramsString}`)).json()).volumes[0] as yandexTrack[];
        return this.getTracksFromYandexTracks([tracks.find((track) => track.realId == trackId)!]);
    }

    private async parsePlaylist(owner: string, playlistId: string): Promise<BaseTrack[]> {
        let params = { owner, kinds: playlistId };
        let paramsString = getParamsString(params);
        paramsString += '&light=true&madeFor=&withLikesCount=true&forceLogin=true&lang=ru&external-domain=music.yandex.ru&overembed=false&ncrnd=0.4617229546606778';
        let tracks = (await (await this.request(`https://music.yandex.ru/handlers/playlist.jsx${paramsString}`)).json()).playlist.tracks as yandexTrack[];
        return this.getTracksFromYandexTracks(tracks);
    }

    private request(url: string): Promise<Response> {
        const response = fetch(url, {
            headers: {
                Accept: 'application / json, text/ javascript, */*; q=0.01',
                'Accept-Encoding': 'gzip, deflate, br',
                Connection: 'keep-alive',
                Cookie: `${YANDEX_COOKIE || ''} active-browser-timestamp=${this.lastVisit};`,
                Host: 'music.yandex.ru',
                Referer: 'https://music.yandex.ru/users/kukaraches48/playlists/3',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36 OPR/87.0.4390.25',
                'X-Current-UID': '693274689',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Retpath-Y': 'https://music.yandex.ru/users/kukaraches48/playlists/3',
                'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="101", "Opera";v="87"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            },
        });
        this.lastVisit = Date.now() / 1000;
        return response;
    }

    private getTracksFromYandexTracks(yandexTracks: yandexTrack[]): BaseTrack[] {
        return yandexTracks.map((track) => {
            let author = track.artists.map((artist) => artist.name).join(', ');
            return new Track(author + ' - ' + track.title);
        });
    }
}

export class YouTubeAdapter implements BasePlatformAdapter {
    private linkRegex = /^https:\/\/www\.youtube\.com\/watch\?v=[A-z0-9-_]*$/;
    private playlistRegex = /^https:\/\/www\.youtube\.com\/playlist\?list=[A-z0-9-_]*$/;
    private trackInPlaylistRegex = /^https:\/\/www\.youtube\.com\/watch\?v=[A-z0-9-_]*&list=[A-z0-9-_]*(&index=[0-9]*)?$/;

    public async parse(argsString: string): Promise<BaseTrack[]> {
        if (this.linkRegex.test(argsString)) {
            return this.parseVideo(argsString);
        } else if (this.playlistRegex.test(argsString)) {
            return await this.parsePlayList(argsString);
        } else if (this.trackInPlaylistRegex.test(argsString)) {
            return await this.parseTrackInPlayList(argsString);
        }
        return [];
    }

    private async parseVideo(link: string): Promise<BaseTrack[]> {
        const name = await youTubeParser.getVideoTitle(link.match(/v=([A-z0-9-_]*)/)![1])
        return [new YoutubeTrack(link, name)];
    }

    private async parseTrackInPlayList(link: string): Promise<BaseTrack[]> {
        const idRegexMatch = link.match(/list=([A-z0-9-_]*)/);
        const videoIndexRegexMatch = link.match(/index=([0-9]*)/);
        const videoIdRegexMatch = link.match(/v=([A-z0-9-_]*)/);
        
        if(!idRegexMatch || (!videoIdRegexMatch && !videoIndexRegexMatch)) {
            console.log(`(ADAPTER)[NOTICE] Invalid data passed for youtube playlist link`);
            return [];
        }

        const id = idRegexMatch[1];
        let index: number;
        const playlistItems = await youTubeParser.getPlaylistItems(id);
        if(!videoIndexRegexMatch) {
            const videoId = videoIdRegexMatch![1];
            index = playlistItems.findIndex(item => item.snippet.resourceId.videoId == videoId);
        } else {
            index = Number(videoIndexRegexMatch[1]) - 1;
        }
        const tracks = playlistItems.slice(index).map((video) => {
            return new YoutubeTrack(`https://www.youtube.com/watch?v=${video.snippet.resourceId.videoId}`, video.snippet.title);
        });
        return tracks;
    }

    private async parsePlayList(link: string): Promise<BaseTrack[]> {
        const idRegex = /list=([A-z0-9-_]*)/;
        const id = [...link.match(idRegex)!][1];
        const tracks = (await youTubeParser.getPlaylistItems(id)).map((video) => {
            return new YoutubeTrack(`https://www.youtube.com/watch?v=${video.snippet.resourceId.videoId}`, video.snippet.title);
        });
        return tracks;
    }
}

export class Adapter {
    private adapters: Map<string, BasePlatformAdapter>;
    public constructor(adapters: Map<string, BasePlatformAdapter>) {
        this.adapters = adapters;
    }

    public async parse(argsString: string): Promise<BaseTrack[]> {
        if (argsString.startsWith('https://music.yandex.ru')) {
            return await this.adapters.get('yandex')!.parse(argsString);
        } else if (argsString.startsWith('https://www.youtube.com')) {
            return await this.adapters.get('youtube')!.parse(argsString);
        }
        return [new Track(argsString)];
    }
}

export const adapters = new Map<string, BasePlatformAdapter>([
    ['yandex', new YandexAdapter()],
    ['youtube', new YouTubeAdapter()],
]);
