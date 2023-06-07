import fetch, { Response } from 'node-fetch';
import { YANDEX_COOKIE } from './constants';
import { BaseTrack, Track, YoutubeTrack } from './music/track';
import { youTubeParser, YTPlaylistItem } from './youtubeDataAPI/ytParser';

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
    matchDomain(domain: string): boolean;
    parse(argsString: string): Promise<BaseTrack[]> | Track[];
}

export class YandexAdapter implements BasePlatformAdapter {
    private linkRegex = /^https:\/\/music\.yandex\.ru\/users\/([^/]*)\/playlists\/([0-9]*)$/;
    private albumRegex = /^https:\/\/music\.yandex\.ru\/album\/([^/]*)$/;
    private trackRegex = /^https:\/\/music\.yandex\.ru\/album\/([^/]*)\/track\/([0-9]*)$/;
    private lastVisit = Date.now() / 1000;

    public matchDomain(domain: string): boolean {
        return domain.startsWith('https://music.yandex.ru');
    }

    public async parse(argsString: string): Promise<BaseTrack[]> {
        try {
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
        } catch (error) {
            console.log(`(ADAPTER)[ERROR] Yandex parser error: ${error}`);
            return [];
        }
    }

    private async parseAlbum(albumId: string): Promise<BaseTrack[]> {
        let paramsString = `?album=${albumId}`;
        paramsString += '&lang=en&external-domain=music.yandex.ru&overembed=false&ncrnd=0.38299750155576406';
        const res = await (await this.request(`https://music.yandex.ru/handlers/album.jsx${paramsString}`)).json();
        const tracks = res.volumes[0] as yandexTrack[];
        if (!tracks) {
            this.handleUnexpectedResponse(res);
        }
        return this.getTracksFromYandexTracks(tracks);
    }

    private async parseTrack(albumId: string, trackId: string): Promise<BaseTrack[]> {
        let paramsString = `?album=${albumId}`;
        paramsString += '&lang=en&external-domain=music.yandex.ru&overembed=false&ncrnd=0.38299750155576406';
        const res = await (await this.request(`https://music.yandex.ru/handlers/album.jsx${paramsString}`)).json();
        const tracks = res.volumes[0] as yandexTrack[];
        if (!tracks) {
            this.handleUnexpectedResponse(res);
        }
        return this.getTracksFromYandexTracks([tracks.find((track) => track.realId == trackId)!]);
    }

    private async parsePlaylist(owner: string, playlistId: string): Promise<BaseTrack[]> {
        let paramsString = getParamsString({ owner, kinds: playlistId });
        paramsString += '&light=true&madeFor=&withLikesCount=true&forceLogin=true&lang=en&external-domain=music.yandex.ru&overembed=false&ncrnd=0.4617229546606778';
        const res = await (await this.request(`https://music.yandex.ru/handlers/playlist.jsx${paramsString}`)).json();
        const tracks = res.playlist?.tracks as yandexTrack[];
        if (!tracks) {
            this.handleUnexpectedResponse(res);
        }
        return this.getTracksFromYandexTracks(tracks);
    }

    private request(url: string): Promise<Response> {
        const response = fetch(url, {
            headers: {
                Host: 'music.yandex.ru',
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0',
                Accept: '*/*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                Referer: 'https://music.yandex.ru/users/kukaraches48/playlists/3',
                Connection: 'keep-alive',
                Cookie: `${YANDEX_COOKIE} active-browser-timestamp=1686099333563`,
                'Sec-Fetch-Dest': 'script',
                'Sec-Fetch-Mode': 'no-cors',
                'Sec-Fetch-Site': 'same-origin',
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

    private handleUnexpectedResponse(response: any) {
        console.log(`(HANDLER)[WARNING] Yandex parser cant parse tracks. response: ${JSON.stringify(response)}`);
        if (response.type == 'captcha' && response.captcha?.['captcha-page'] && response.captcha?.['img-url']) {
            console.log(`(HANDLER)[INFO] Yandex parser got capthca. Captcha page url: ${response.captcha['captcha-page']}`);
        }
    }
}

export class YouTubeAdapter implements BasePlatformAdapter {
    private linkRegex = /^https:\/\/www\.youtube\.com\/watch\?.*v=[A-z0-9-_]*/;
    private playlistRegex = /^https:\/\/www\.youtube\.com\/(playlist|watch)\?.*list=[A-z0-9-_]*.*$/;

    public matchDomain(domain: string): boolean {
        return domain.startsWith('https://www.youtube.com');
    }

    public async parse(argsString: string): Promise<BaseTrack[]> {
        if (this.playlistRegex.test(argsString)) {
            return await this.parsePlayList(argsString);
        } else if (this.linkRegex.test(argsString)) {
            return this.parseVideo(argsString);
        }
        return [];
    }

    private async parseVideo(link: string): Promise<BaseTrack[]> {
        const name = await youTubeParser.getVideoTitle(link.match(/v=([A-z0-9-_]*)/)![1]);
        return [new YoutubeTrack(link, name)];
    }

    private async getTracksFromPlaylist(playlist: YTPlaylistItem[], params: { videoId?: string; index?: number }): Promise<BaseTrack[]> {
        let { videoId, index } = params;
        if (!index) {
            index = playlist.findIndex((item) => item.snippet.resourceId.videoId == videoId);
        }
        const tracks = playlist.slice(index).map((video) => {
            return new YoutubeTrack(`https://www.youtube.com/watch?v=${video.snippet.resourceId.videoId}`, video.snippet.title);
        });
        return tracks;
    }

    private async parsePlayList(link: string): Promise<BaseTrack[]> {
        const idRegexMatch = link.match(/list=([A-z0-9-_]*)/);
        const videoIndexRegexMatch = link.match(/index=([0-9]*)/);
        const videoIdRegexMatch = link.match(/v=([A-z0-9-_]*)/);

        if (!idRegexMatch) {
            console.log('(ADAPTER)[NOTICE] Invalid data passed for youtube playlist link');
            return [];
        }

        const id = idRegexMatch[1];
        const playlist = await youTubeParser.getPlaylistItems(id);
        const videoId = videoIdRegexMatch ? videoIdRegexMatch[1] : undefined;
        const index = videoIndexRegexMatch ? Number(videoIndexRegexMatch[1]) - 1 : undefined;

        return this.getTracksFromPlaylist(playlist, { videoId, index });
    }
}

export class AdapterManager {
    private _adapters: BasePlatformAdapter[];
    public constructor(adapters: BasePlatformAdapter[]) {
        this._adapters = adapters;
    }

    public async parse(argsString: string): Promise<BaseTrack[]> {
        for (const adapter of this._adapters) {
            if (adapter.matchDomain(argsString)) {
                return await adapter.parse(argsString);
            }
        }
        const searchedTrack = await youTubeParser.searchVideo(argsString);
        if (!searchedTrack) return [];
        return [new YoutubeTrack(`https://www.youtube.com/watch?v=${searchedTrack.id.videoId}`, searchedTrack.snippet.title)];
    }
}

export const adapter = new AdapterManager([new YandexAdapter(), new YouTubeAdapter()]);
