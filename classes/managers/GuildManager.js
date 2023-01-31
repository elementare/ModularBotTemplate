const guildDataSchema = require('../../../models/guildSchema');
const Guild = require('../structs/Guild.js');
module.exports = class GuildManager {
    constructor(client) {
        this.client = client
        if (!client) {
            throw new Error('Client is not defined')
        }
    }

    fetch(id) {
        return new Promise(async (resolve, err) => {
            const guild = await this.client.guilds.fetch(id)
            const guildData = await guildDataSchema.findOne({guildId: id})
            if (!guildData) return err('Guild data not present')
            const guildClass = new Guild(this.client, guild, guildData)
            return resolve(guildClass)
        })
    }
}