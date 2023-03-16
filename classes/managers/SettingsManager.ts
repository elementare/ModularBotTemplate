import {ExtendedClient} from "../../types";
import Guild from "../structs/Guild";
import {Logger} from "winston";

export default class GuildManager {
    private readonly client: ExtendedClient;
    private readonly logger: Logger;


    constructor(client: ExtendedClient, logger: Logger) {
        this.client = client
        this.logger = logger
        if (!client) {
            throw new Error('Client is not defined')
        }
    }

    setSetting(guild: Guild, settingId: string, newValue: string) {
        return new Promise<void>(async (resolve, reject) => {
            this.logger.debug(`Setting ${settingId} to ${newValue} for guild ${guild.guild.id}`)
            const setting = guild.settings.find((setting) => setting.id === settingId)
            if (!setting) return reject('Setting not found')
            if (setting.updateFunction) {
                const updatedSetting = structuredClone(setting)
                updatedSetting.value = newValue
                const result = await setting.updateFunction({
                    client: this.client,
                    logger: this.logger,
                    oldConfig: setting,
                    newConfig: updatedSetting
                }).catch(() => false)
                if (result !== true) return reject(result)
            }
            const guildSetting = guild.data.settings.find((guildSetting: any) => guildSetting.id === settingId)
            if (guildSetting) {
                guildSetting.value = newValue
            } else {
                guild.data.settings.push({
                    id: settingId,
                    value: newValue
                })
            }
            await guild.data.save()
            const parsed = JSON.parse(newValue)
            switch (setting.type) {
                case 'boolean':
                case "number":
                case "text":
                case "button":
                case "select":
                case "object":
                case "list":
                    setting.value = parsed
                    break
                case "role":
                    const role = guild.guild.roles.cache.get(parsed) || await guild.guild.roles.fetch(parsed).catch(() => undefined)
                    if (role === null) return reject('Role not found')
                    setting.value = role
                    break
                case "channel":
                    const channel = guild.guild.channels.cache.get(parsed) || await guild.guild.channels.fetch(parsed).catch(() => undefined)
                    if (channel === null) return reject('Channel not found')
                    setting.value = channel
                    break
                case "user":
                    setting.value = await this.client.profileHandler.fetchOrCreate(parsed)
                    break
            }
            resolve()
        })
    }

    unsetSetting(guild: Guild, settingId: string) {

    }
}