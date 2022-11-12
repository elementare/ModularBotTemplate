

import User from '../structs/User'
import {ExtendedClient} from "../../types";
import Guild from "../structs/Guild";
import {Collection, FetchMembersOptions, GuildMember} from "discord.js";

async function getGuilds(client: ExtendedClient, guilds: Array<string>): Promise<Array<Guild>> {
    const guildArray = []
    for (const guild of guilds) {
        guildArray.push(await client.guildHandler.fetchOrCreate(guild))
    }
    return guildArray
}

export default class userHandler {
    private readonly client: ExtendedClient;
    constructor(client: ExtendedClient) {
        this.client = client
    }
    fetch(id: string, guild: string): Promise<User> {
        return new Promise(async (resolve, err) => {
            const userProfile = await this.client.defaultModels.user.findOne({id: id})
            if (!userProfile) return err('No user profile!')
            const guildObj = await this.client.guildHandler.fetchOrCreate(guild).catch(() => {})
            if (!guildObj) return err('No guild found with the id!')
            const member = await guildObj.guild.members.fetch(id).catch(() => {
            })
            if (!member) return err('No member!')
            resolve(new User(this.client, member, guildObj,userProfile))
        })
    }

    fetchOrCreate(id: string, guild: string): Promise<User> {
        return new Promise(async (resolve, err) => {
            let userProfile = await this.client.defaultModels.user.findOne({id: id})
            const guildObj = await this.client.guildHandler.fetchOrCreate(guild).catch(() => {})
            if (!guildObj) return err('No guild!')
            if (!userProfile) {
                const profile = await this.client.defaultModels.user.create({
                    id: id,
                    guildId: guild
                })
                await profile.save()
                userProfile = await this.client.defaultModels.user.findOne({id: id})
            }
            const member = await guildObj.guild.members.fetch(id).catch(() => {
            })
            if (!member) {
                await userProfile.delete()
                return err('No member!')
            }
            resolve(new User(this.client, member,guildObj, userProfile))
        })
    }

    delete(id: string, guild: string) {
        return new Promise(async (resolve, err) => {
            const userProfile = await this.client.defaultModels.user.findOneAndDelete({id: id, guildId: guild})
            if (!userProfile) err('No user profile!')
            resolve(userProfile)
        })
    }

    create(id: string, guild: string): Promise<User> {
        return new Promise(async (resolve, err) => {
            const userTest = await this.client.defaultModels.user.findOne({id: id})
            if (userTest) return err('User already exists!')
            const userProfile = await this.client.defaultModels.user.create({
                id: id,
                guildId: guild
            })
            await userProfile.save()
            const guildObj = await this.client.guildHandler.fetchOrCreate(guild).catch(() => {})
            if (!guildObj) return err('No guild!')
            const member = await guildObj.guild.members.fetch(id).catch(() => {
            })
            if (!member) return err('No member!')
            resolve(new User(this.client, member, guildObj,userProfile))
        })
    }

    findOrCreateProfile(id: string, guild: string): Promise<User> {
        return new Promise(async (resolve) => {
            let userProfile = await this.client.defaultModels.user.findOne({id: id})
            if (!userProfile) {
                const profile = await this.client.defaultModels.user.create({
                    id: id,
                    guildId: guild
                })
                await profile.save()
                userProfile = await this.client.defaultModels.user.findOne({id: id})
            }
            resolve(userProfile)
        })
    }

    findByKV(filter: any): Promise<Array<User>> {
        return new Promise(async (resolve, err) => {
            const userProfiles = await this.client.defaultModels.user.find(filter)
            if (!userProfiles || userProfiles.length === 0) return err('No user profiles!')
            const guilds = await userProfiles.map((profile: User) => profile.guild.guild.id)
            const guildArray = await getGuilds(this.client, guilds)
            const userIdsByGuild = new Map<string, string>()
            userProfiles.forEach((profile: User) => {
                userIdsByGuild.set(profile.guild.guild.id, profile.id)
            })
            const usersByGuild = new Map<string, Collection<string, GuildMember> | GuildMember>()
            for (const guild of guildArray) {
                const ids = userIdsByGuild.get(guild.guild.id)
                const members = await guild.guild.members.fetch(ids as FetchMembersOptions).catch(() => {})
                if (!members) continue
                usersByGuild.set(guild.guild.id, members)
            }
            resolve(guildArray.map((guild: Guild) => {
                const members = usersByGuild.get(guild.guild.id) as Collection<string, GuildMember> | GuildMember
                if (members instanceof Collection) {
                    return members.map((member: GuildMember) => new User(this.client, member, guild, userProfiles.find((profile: User) => profile.id === member.id)))
                } else {
                    return [new User(this.client, members, guild, userProfiles.find((profile: User) => profile.id === members.id))]
                }
            }).flat())
        })
    }
}