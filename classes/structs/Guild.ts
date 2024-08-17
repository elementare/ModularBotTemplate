import * as discord from 'discord.js'
import {ExtendedClient} from "../../types";
import {Collection} from "discord.js";
import {Setting} from "../../settings/Setting";
import {ObjectFlags} from "./ObjectFlags";
import {HydratedDocument} from "mongoose";
import {Permissions} from "./Permissions";
import {parseFromDatabase} from "../../util/parsingRelated";

export default class Guild {
    public client: ExtendedClient;
    public readonly guild: discord.Guild;
    public data: HydratedDocument<any>;
    public settings: Collection<string,Setting<unknown>>;
    public permissionOverrides: Permissions;
    public readonly id: string;
    public flags: ObjectFlags;
    constructor(client: ExtendedClient, guild: discord.Guild, guildData: any, settings: Collection<string,Setting<unknown>>) {
        this.client = client
        this.guild = guild
        this.data = guildData
        this.settings = settings
        this.permissionOverrides = new Permissions(client.logger, parseFromDatabase(guildData.permissionsOverrides || []))
        this.id = guild.id
        this.flags = new ObjectFlags(client, this)
    }
}

