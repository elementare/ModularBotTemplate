import {ExtendedClient} from "../../types";
import SlashCommand from "../structs/SlashCommand";


export default class SlashManager {
    private readonly client: ExtendedClient;

    constructor(client: ExtendedClient) {
        this.client = client
    }

    registerGlobalCommands(): Promise<void> {
        return new Promise(async (resolve, err) => {
            const commands = this.client.commands.slash.filter(c => c.global).map(c => c.data.toJSON())
            await this.client.application?.commands.set(commands).catch(err)
            resolve()
        })
    }
    registerCommandForGuild(commands: Array<SlashCommand> | SlashCommand, ids: Array<string>): Promise<void> {
        return new Promise(async (resolve, err) => {
            if (!Array.isArray(commands)) commands = [commands]
            const commandData = commands.map(c => c.data.toJSON())
            for (const id of ids) {
                const guild = await this.client.guilds.fetch(id).catch(() => {
                })
                if (!guild) return err('No guild found with the id!')
                await guild.commands.set(commandData).catch(err)
            }
            resolve()
        })
    }



}