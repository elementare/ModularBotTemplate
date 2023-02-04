import * as discord from "discord.js";
import Guild from "./Guild"
export default class User {
    public readonly id: string;
    public readonly member: discord.GuildMember;
    public readonly guild: Guild
    public readonly user: discord.User
    private client: discord.Client;
    public data: any;
    constructor(client: discord.Client, member: discord.GuildMember, guild: Guild, data: any) {
        this.id = member.id
        this.member = member
        this.user = member?.user || member
        this.client = client
        this.data = data
        this.guild = guild
    }
}