import {ExtendedClient, Module, Options, PrimitiveWithObject, ReturnOptions} from "../../types";
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

    setSetting(guild: Guild, settingId: string, newValue: Options[keyof PrimitiveWithObject]) {
        return new Promise<void>(async (resolve, reject) => {
            this.logger.debug(`Setting ${settingId} to ${newValue} for guild ${guild.guild.id}`)
            const setting = guild.settings.find((setting) => setting.id === settingId)
            if (!setting) return reject('Setting not found')
            if (setting.updateFunction) {
                const updatedSetting = structuredClone(setting)
                updatedSetting.value = newValue
                const result = await setting.updateFunction({client: this.client, logger: this.logger, oldConfig: setting, newConfig: updatedSetting})
                if (result !== true) return reject(result)
            }
            setting.value = newValue
            const guildSetting = guild.data.settings.find((guildSetting: any) => guildSetting.id === settingId)
            if (guildSetting) {
                guildSetting.value = JSON.stringify(newValue)
                await guild.data.save()
                return resolve()
            } else {
                guild.data.settings.push({
                    id: settingId,
                    value: JSON.stringify(newValue)
                })
                await guild.data.save()
                return resolve()
            }
        })
    }
    unsetSetting(guild: Guild, settingId: string) {

    }
}