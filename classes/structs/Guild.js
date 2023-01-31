module.exports = class Guild {
    constructor(client, guild, guildData) {
        this.client = client
        this.guild = guild
        this.data = guildData
    }

    save() {
        return new Promise(async (resolve, reject) => {
            await this.data.save()
            return resolve()
        })
    }
}
