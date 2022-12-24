import { norepeat } from './slashcommands/norepeat';
import { pause } from './slashcommands/pause';
import { play } from './slashcommands/play';
import { queue } from './slashcommands/queue';
import { repeat_current } from './slashcommands/repeat_current';
import { rm_messages } from './slashcommands/rm_messages';
import { skip } from './slashcommands/skip';
import { stop } from './slashcommands/stop';
import { unpause } from './slashcommands/unpause';

export const commands = [
    play, pause, unpause, skip, stop, repeat_current, norepeat, queue, rm_messages
];