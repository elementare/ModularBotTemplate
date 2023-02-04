import * as discord from 'discord.js'
import {ExtendedClient} from "../../types";

export default class Guild {
    private client: ExtendedClient;
    public readonly guild: discord.Guild;
    public data: any;
    constructor(client: ExtendedClient, guild: discord.Guild, guildData: any) {
        this.client = client
        this.guild = guild
        this.data = guildData
    }
}

