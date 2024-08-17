import * as discord from "discord.js";
import Guild from "./Guild"
import {Collection} from "discord.js";
import {Setting} from "../../settings/Setting";
import {ExtendedClient} from "../../types";
import {ObjectFlags} from "./ObjectFlags";
import {HydratedDocument} from "mongoose";


export default class User {
    public readonly id: string;
    public readonly member: discord.GuildMember;
    public readonly guild: Guild
    public readonly user: discord.User
    public client: ExtendedClient;
    public data: HydratedDocument<any>;
    public settings: Collection<string,Setting<unknown>>;
    public flags: ObjectFlags;
    constructor(client: ExtendedClient, member: discord.GuildMember, guild: Guild, settings: Collection<string, Setting<unknown>>,data: any) {
        this.id = member.id
        this.member = member
        this.user = member?.user || member
        this.client = client
        this.data = data
        this.guild = guild
        this.settings = settings
        this.flags = new ObjectFlags(client, this)
    }

}