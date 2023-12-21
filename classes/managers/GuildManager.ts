import Guild from "../structs/Guild";
import {ComplexSetting, CustomSetting, DbSetting, ExtendedClient, SavedSetting, SettingStructure} from "../../types";
import { Collection } from "discord.js";
import { Guild as discordGuild } from "discord.js";
import {Logger} from "winston";
import {Setting} from "../../settings/Setting";
async function parseSettingValue(setting: string, type: string, client: ExtendedClient, guildData: any, guild: discordGuild, structure: SettingStructure, logger: Logger): Promise<unknown> {
    const typeObj = client.typesCollection.get(type)
    if (setting === 'null') return null
    if (type.endsWith('-arr')) {
        const baseType = type.split('-')[0]
        const arr = JSON.parse(setting)
        const final = []
        for (const item of arr) {
            final.push(await parseSettingValue(JSON.stringify(item), baseType, client, guildData, guild, structure, logger))
        }
        return final
    }
    if (!typeObj) return JSON.parse(setting)
    if (typeObj.name === 'complex') {
        logger.debug(`Parsing complex setting ${structure.name}`)
        const final: any = {}
        const parsed = JSON.parse(setting)
        const keys = Object.keys(parsed)
        const schema: ComplexSetting["schema"] = (structure as any).schema
        logger.debug(`Schema seems: ${keys.length > 0 ? "healthy": "unhealthy"}`)
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            const value = parsed[key]
            const schemaValue = schema[key]

            const partial: Partial<CustomSetting> = schemaValue
            partial.permission = structure.permission
            partial.name = key
            final[key] = await parseSettingValue(JSON.stringify(value), schemaValue.type, client, guildData, guild, partial as CustomSetting, logger)
        }
        return final
    }
    if (typeObj.parse) {
        try {
            return await typeObj.parse(setting, client, guildData, guild)
        } catch (e) {
            return null
        }
    }
    return JSON.parse(setting)
}
function getType(setting: SettingStructure) {
    return setting.type
}
async function getAllSettings (client: ExtendedClient, guildData: any, guild: discordGuild, logger: Logger) {
    const settings = client.modules.map((module) => module.settings).flat()
    const settingsMap = new Collection<string, Setting<any>>()
    for (const setting of settings) {
        const settingData = guildData.settings.get(setting.name) as DbSetting
        // Loading bypasses default loading and parsing steps,
        // Should only be used with settings that have a customized save flow that saves to elsewhere than the normal settings table
        if (setting.load) {
            const result = await setting.load(guild, guildData)
            setting.value = result
            settingsMap.set(setting.name, setting)
            continue
        }
        if (settingData) {
            if (setting.parse) {
                const parsed = await setting.parse(settingData.value, client, guildData, guild)
                setting.value = parsed
            } else {
                setting.value = JSON.parse(settingData.value)
            }
        }
        settingsMap.set(setting.name, setting)
    }
    return settingsMap
}

export default class GuildManager {
    private readonly client: ExtendedClient;
    private settingCache: Collection<string, Collection<string, Setting<any>>> = new Collection<string, Collection<string, Setting<any>>>()
    private readonly logger: Logger;
    constructor(client: ExtendedClient, logger: Logger) {
        this.client = client
        this.logger = logger
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
            const a = await getAllSettings(this.client, guildData, guild, this.logger)
            const settings = this.settingCache.ensure(id, () => a)
            this.settingCache.set(id, settings)
            return resolve(new Guild(this.client, guild, guildData, settings))
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
                const a = await getAllSettings(this.client, guildProfile, guild, this.logger)
                const settings = this.settingCache.ensure(guild.id, () => a )
                this.settingCache.set(guild.id, settings)
                guilds.push(new Guild(this.client, guild, guildProfile, settings))
            }
            this.logger.debug(`Found ${guilds.length} guilds with filter "${JSON.stringify(filter)}" while searching by KV`)
            resolve( guilds )
        })
    }
}
/*
    settings = [{ id: string, value: any }]
 */