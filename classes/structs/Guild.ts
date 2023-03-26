import * as discord from 'discord.js'
import {ConfigOption, ExtendedClient} from "../../types";
import {Collection} from "discord.js";

export default class Guild {
    private client: ExtendedClient;
    public readonly guild: discord.Guild;
    public data: any;
    public settings: Collection<string,ConfigOption>;
    constructor(client: ExtendedClient, guild: discord.Guild, guildData: any, settings: Collection<string,ConfigOption>) {
        this.client = client
        this.guild = guild
        this.data = guildData
        this.settings = settings
    }
}

