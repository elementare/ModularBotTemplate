import Guild from "../structs/Guild";
import {ExtendedClient} from "../../types";
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
            const guild = await this.client.guilds.fetch(id).catch(() => {})
            if (!guild) return err('No guild!')
            const guildData = await this.client.defaultModels.guild.findOne({id: id})
            if (!guildData) return err('Guild data not present')
            return resolve(new Guild(this.client, guild, guildData))
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
            return resolve(new Guild(this.client, guild, guildData))
        })
    }
}