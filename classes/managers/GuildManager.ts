import Guild from "../structs/Guild";
import {ConfigOption, ExtendedClient} from "../../types";
import {Collection} from "discord.js";

function getAllsettings (client: ExtendedClient, guildData: any) {
    const settings = client.modules.map((module) => module.settings).flat()
    const a = settings.map((setting) => {
        const guildSetting = guildData.settings.find((guildSetting: any) => guildSetting.eventName === setting.eventName)
        if (guildSetting) setting.value = JSON.parse(guildSetting.value)
        else setting.value = JSON.parse(setting.default || 'null')
        return setting
    })
    const b = new Collection<string, ConfigOption>()
    a.forEach((setting) => {
        b.set(setting.eventName, setting)
    })
    return b
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
            const settings = getAllsettings(this.client, guildData)
            return resolve(new Guild(this.client, guild, guildData, settings))
        })
    }
}
/*
    settings = [{ id: string, value: any }]
 */