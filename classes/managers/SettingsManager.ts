import {ConfigOption, ExtendedClient} from "../../types";
import {Logger} from "winston";
import Guild from "../structs/Guild";

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

    setSetting(guild: Guild, setting: string, value: string): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
                const settingData = guild.settings.get(setting)
                if (!settingData) return reject('Setting not found')
                const newData: ConfigOption = {
                    eventName: settingData.eventName,
                    name: settingData.name,
                    description: settingData.description,
                    value: value,
                    default: settingData.default
                }
                guild.data.settings.set(setting, newData)
                await guild.data.save()
                const newParsedData: ConfigOption = {
                    eventName: settingData.eventName,
                    name: settingData.name,
                    description: settingData.description,
                    value: JSON.parse(value),
                    default: settingData.default
                }
                guild.settings.set(setting, newParsedData)
                return resolve(true)
            }
        )
    }
}