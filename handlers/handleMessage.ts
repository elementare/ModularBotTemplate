import {Message} from "discord.js";
import {CommandsMap, ExtendedClient} from "../types";
import {Logger} from "winston";
const prefix: string = 'k!';
export default async (client: ExtendedClient, commands: CommandsMap, message: Message) => {
    if (message.author.bot) return;
    if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();
        client.logger.info(`Command received: ${commandName}`);
        if (!commandName) return;
        const command = commands.get(commandName);
        client.logger.info(`Command found: ${command?.name}`);
        if (!command) return;
        if (!command.logger) command.logger = client.logger.child({ fallback: true });
        command.func({
            client: client,
            message: message,
            args: args,
            profile: await client.profileHandler.fetchOrCreate(message.author.id),
            logger: command.logger as Logger
        })
    }
}