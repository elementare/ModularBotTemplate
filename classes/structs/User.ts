import {Client, GuildMember} from "discord.js";
import * as discord from "discord.js";
module.exports = class User {
    public id: string;
    public member: discord.GuildMember;
    public user: discord.User
    private client: Client;
    private data: any;
    constructor(client: discord.Client, member: discord.GuildMember, data: any) {
        this.id = member.id
        this.member = member
        this.user = member?.user || member
        this.client = client
        this.data = data

    }
}