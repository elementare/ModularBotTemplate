import Guild from "../structs/Guild";
import {ExtendedClient} from "../../types";

function getAllsettings (client: ExtendedClient, guildData: any) {
    const settings = client.modules.map((module) => module.settings).flat()
    return settings.map((setting) => {
        const guildSetting = guildData.settings.find((guildSetting: any) => guildSetting.id === setting.id)
        if (guildSetting) setting.value = JSON.parse(guildSetting.value)
        else setting.value = setting.default
        return setting
    })
}

export default class GuildManager {
    private readonly client: ExtendedClient;

    constructor(client: ExtendedClient) {
        this.client = client
        if (!client) {
            throw new Error('Client is not defined')
        }
    }

    fetch(id: string): Promise<Guild> {
        return new Promise(async (resolve, err) => {
            const guild = await this.client.guilds.fetch(id).catch(() => {
            })
            if (!guild) return err('No guild!')
            const guildData = await this.client.defaultModels.guild.findOne({id: id})
            if (!guildData) return err('Guild data not present')
            const settings = getAllsettings(this.client, guildData)
            return resolve(new Guild(this.client, guild, guildData, settings))
        })
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