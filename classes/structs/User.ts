import * as discord from "discord.js";
module.exports = class User {
    public readonly id: string;
    public readonly member: discord.GuildMember;
    public readonly user: discord.User
    private client: discord.Client;
    private data: any;
    constructor(client: discord.Client, member: discord.GuildMember, data: any) {
        this.id = member.id
        this.member = member
        this.user = member?.user || member
        this.client = client
        this.data = data
    }
}