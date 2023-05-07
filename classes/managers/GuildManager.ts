import Guild from "../structs/Guild";
import {ConfigOption, ExtendedClient} from "../../types";
import {Collection, FetchMembersOptions, GuildMember} from "discord.js";
import User from "../structs/User";

function getAllSettings (client: ExtendedClient, guildData: any) {
    const settings = client.modules.map((module) => module.settings).flat()
    const settingsMap = new Collection<string, ConfigOption>()
    for (const setting of settings) {
        const settingData = guildData.settings.get(setting.eventName)
        if (!settingData) {
            setting.value = JSON.parse(setting.default || 'null')
            settingsMap.set(setting.eventName, setting)
        } else {
            settingData.value = JSON.parse(settingData.value)
            settingsMap.set(setting.eventName, settingData)
        }
    }
    return settingsMap
}

export default class GuildManager {
    private readonly client: ExtendedClient;

    constructor(client: ExtendedClient) {
        this.client = client
        if (!client) {
            throw new Error('Client is not defined')
        }
    }

    fetchOrCreate(id: string): Promise<Guild> {
        return new Promise(async (resolve, err) => {
            const guild = await this.client.guilds.fetch(id)
            if (!guild) return err('No guild!')
            let guildData = await this.client.defaultModels.guild.findOne({id: id})
            if (!guildData) {
                const profile = await this.client.defaultModels.guild.create({
                    id: id
                })
                await profile.save()
                guildData = profile
            }
            return resolve(new Guild(this.client, guild, guildData, getAllSettings(this.client, guildData)))
        })
    }

    findByKV(filter: any): Promise<Array<Guild>> {
        return new Promise(async (resolve, err) => {
            const guildProfiles = await this.client.defaultModels.guild.find(filter)
            if (!guildProfiles || guildProfiles.length === 0) return err('No guild profiles!')
            const guilds: Guild[] = []
            for (const guildProfile of guildProfiles) {
                const guild = await this.client.guilds.fetch(guildProfile.id)
                if (!guild) continue
                guilds.push(new Guild(this.client, guild, guildProfile, getAllSettings(this.client, guildProfile)))
            }
            resolve( guilds )
        })
    }
}
/*
    settings = [{ id: string, value: any }]
 */