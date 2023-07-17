import User from '../structs/User'
import {ExtendedClient} from "../../types";
import Guild from "../structs/Guild";
import {Collection, FetchMembersOptions, GuildMember} from "discord.js";
import {Logger } from "winston";

async function getGuilds(client: ExtendedClient, guilds: Array<string>): Promise<Array<Guild>> {
    const guildArray = []
    for (const guild of guilds) {
        guildArray.push(await client.guildHandler.fetchOrCreate(guild))
    }
    return guildArray
}

export default class userHandler {
    private readonly client: ExtendedClient;
    private logger: Logger;
    constructor(client: ExtendedClient, logger: Logger) {
        this.client = client
        this.logger = logger
    }
    fetch(id: string, guild: string): Promise<User> {
        return new Promise(async (resolve, err) => {
            const userProfile = await this.client.defaultModels.user.findOne({id: id, guildId: guild})
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
            this.logger.debug(`Fetching user ${id} from guild ${guild}`)
            let userProfile = await this.client.defaultModels.user.findOne({id: id, guildId: guild})
            const guildObj = await this.client.guildHandler.fetchOrCreate(guild).catch(() => {})
            if (!guildObj) return err('No guild!')
            if (!userProfile) {
                const profile = await this.client.defaultModels.user.create({
                    id: id,
                    guildId: guild
                })
                await profile.save()
                userProfile = await this.client.defaultModels.user.findOne({id: id, guildId: guild})
            }
            // this.logger.debug(`Created user profile if it didn't exist` )
            const member = await guildObj.guild.members.fetch(id).catch(() => {
            })
            if (!member) {
                await userProfile.delete()
                return err('No member!')
            }
            this.logger.debug(`Fetched user ${id} from guild ${guild}`)
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
            const userTest = await this.client.defaultModels.user.findOne({id: id, guildId: guild})
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
            let userProfile = await this.client.defaultModels.user.findOne({id: id, guildId: guild})
            if (!userProfile) {
                const profile = await this.client.defaultModels.user.create({
                    id: id,
                    guildId: guild
                })
                await profile.save()
                userProfile = await this.client.defaultModels.user.findOne({id: id, guildId: guild})
            }
            resolve(userProfile)
        })
    }

    findByKV(filter: any): Promise<Array<User>> {
        return new Promise(async (resolve, err) => {
            const userProfiles = await this.client.defaultModels.user.find(filter)
            if (!userProfiles || userProfiles.length === 0) return err('No user profiles!')
            const guilds = userProfiles.map((profile: any) => profile.guildId)
            const guildArray = await getGuilds(this.client, guilds)
            const userIdsByGuild = new Map<string, string>()
            userProfiles.forEach((profile: any) => {
                userIdsByGuild.set(profile.guildId, profile.id)
            })
            const usersByGuild = new Map<string, Collection<string, GuildMember> | GuildMember>()
            for (const guild of guildArray) {
                const ids = userIdsByGuild.get(guild.guild.id)
                const members = await guild.guild.members.fetch(ids as FetchMembersOptions).catch(() => {})
                if (!members) continue
                usersByGuild.set(guild.guild.id, members)
            }
            resolve(guildArray.map((guild: Guild) => {
                const members = usersByGuild.get(guild.guild.id) as Collection<string, GuildMember> | GuildMember | undefined
                if (members instanceof Collection) {
                    return members.map((member: GuildMember) => new User(this.client, member, guild, userProfiles.find((profile: User) => profile.id === member.id)))
                } else if (members instanceof GuildMember) {
                    return [new User(this.client, members, guild, userProfiles.find((profile: User) => profile.id === members.id))]
                } else {
                    return []
                }
            }).flat())
        })
    }
}