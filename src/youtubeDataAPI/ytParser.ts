import fetch from 'node-fetch';
import { API_KEYS, MAX_PLAYLIST_LENGTH } from '../constants';

let API_KEY: string;
let CURRENT_KEY_INDEX = -1;
refreshApiKey();

function refreshApiKey() {
    if (!API_KEYS) {
        console.log('(API KEYS)[ERROR] No api keys provided');
        return;
    }
    CURRENT_KEY_INDEX = CURRENT_KEY_INDEX + 1;
    if (CURRENT_KEY_INDEX >= API_KEYS.length) {
        throw new Error('All API keys exceeded');
    }
    console.log(`(API KEYS)[INFO] Refreshed API keys old API_KEY: ${API_KEY}; new API_KEY: ${API_KEYS[CURRENT_KEY_INDEX]}`);
    API_KEY = API_KEYS[CURRENT_KEY_INDEX];
}

export type YTVideo = {
    kind: string;
    etag: string;
    id: {
        kind: string;
        videoId: string;
    };
};

export type YTPlaylistItem = {
    kind: string;
    snippet: {
        resourceId: {
            kind: string,
            videoId: string
        },
        title: string
    }
};

class YTParser {
    public async searchVideo(name: string): Promise<YTVideo> {
        const queryParams = `part=id&maxResults=20&q=${encodeURI(name)}`;

        let youtubeSearchResult = await this.request(`https://www.googleapis.com/youtube/v3/search?${queryParams}`);
        while (youtubeSearchResult?.error?.code === 403) {
            refreshApiKey();
            youtubeSearchResult = await this.request(`https://www.googleapis.com/youtube/v3/search?${queryParams}`);
        }
        return youtubeSearchResult.items.find((item: YTVideo) => item.id.kind == 'youtube#video');
    }

    public async getVideoTitle(id: string): Promise<string> {
        const title = (await this.request(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}`))?.title;
        console.log(title);
        return title;
    }

    public async getPlaylistItems(id: string): Promise<YTPlaylistItem[]> {
        const queryParams = `part=snippet&maxResults=${MAX_PLAYLIST_LENGTH + 1}&playlistId=${encodeURI(id)}`;
        const youtubeSearchResult = await this.request(`https://www.googleapis.com/youtube/v3/playlistItems?${queryParams}`);
        return youtubeSearchResult.items as YTPlaylistItem[];
    }

    private async request(url: string): Promise<any> {
        const youtubeSearchResult = await (await fetch(`${url}&key=${API_KEY}`)).json();
        if (youtubeSearchResult?.error?.code === 403) {
            refreshApiKey();
            return await this.request(url);
        }
        return youtubeSearchResult;
    }
}

export const youTubeParser = new YTParser();
