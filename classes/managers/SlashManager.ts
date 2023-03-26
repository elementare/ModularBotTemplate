import {ExtendedClient} from "../../types";


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


}