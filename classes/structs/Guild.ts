import * as discord from 'discord.js'
import { ExtendedClient, SavedSetting} from "../../types";
import {Collection} from "discord.js";
import {Setting} from "../../settings/Setting";

export default class Guild {
    private client: ExtendedClient;
    public readonly guild: discord.Guild;
    public data: any;
    public settings: Collection<string,Setting<any>>;
    constructor(client: ExtendedClient, guild: discord.Guild, guildData: any, settings: Collection<string,Setting<any>>) {
        this.client = client
        this.guild = guild
        this.data = guildData
        this.settings = settings
    }
}

