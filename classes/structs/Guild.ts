import * as discord from 'discord.js'
import {ExtendedClient, GenericOption} from "../../types";

export default class Guild {
    private client: ExtendedClient;
    public readonly guild: discord.Guild;
    public data: any;
    public settings: Array<GenericOption>;
    constructor(client: ExtendedClient, guild: discord.Guild, guildData: any, settings: Array<GenericOption>) {
        this.client = client
        this.guild = guild
        this.data = guildData
        this.settings = settings
    }
}

