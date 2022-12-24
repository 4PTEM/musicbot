import { CommandInteraction, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

export type Command = {
    data: RESTPostAPIChatInputApplicationCommandsJSONBody;
    execute: (Interaction: CommandInteraction<'cached' | 'raw'>) => Promise<void> | void;
};
