import mongoose from "mongoose";
import winston, {Logger} from "winston";
import {Client, ClientEvents, Collection} from "discord.js";
import ProfileManager from "./managers/ProfileManager";

interface ExtendedClient extends Client {
    logger: Logger;
    commands: CommandsMap;

    profileHandler: ProfileManager;
    modules: Collection<string, Module>
}

interface mongoseSchemaData {
    [key: string]: mongoose.SchemaDefinitionProperty
}

interface manifest {
    name: string,
    description: string,
    version: string,
    color: string,
    data: {
        user: Array<[string, { type: string, default?: any }]>,
        guild: Array<[string, { type: string, default?: any }]>
    },
    initFile: string,
    eventsFolder: string,
    commandsFolder: string
}
type CommandsMap = Map<string, Command>
interface Module {
    name: string,
    description: string,
    version: string,
    color: string,
    logger: winston.Logger,
    initFunc: Function,
    data: manifest,
    commands: CommandsMap | undefined
}

interface ExtendedClientEvents extends ClientEvents {

}


interface Event {
    readonly event: keyof ExtendedClientEvents,
    readonly func: (client: Client, logger: Logger, ...args: any[]) => void
}
interface Command {
    readonly name: string,
    readonly aliases: Array<string>,
    readonly description: string,
    readonly howToUse: string,

    logger?: Logger,
    readonly func: ({
                        client: Client,
                        logger: Logger,
                        message: Message,
                        profile: User,
                        args: Array
                    }) => void

}