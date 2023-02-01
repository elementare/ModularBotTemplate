import mongoose from "mongoose";
import winston, {Logger} from "winston";
import {Client, ClientEvents, Collection, Message, Role, VoiceChannel} from "discord.js";
import ProfileManager from "./managers/ProfileManager";
import User from "./classes/structs/User";
import {Awaitable} from "@discordjs/util";

class BaseModuleInterfacer {
    [key: string]: any;
}

interface ExtendedClient extends Client {
    logger: Logger;
    commands: CommandsMap;

    profileHandler: ProfileManager;
    modules: Collection<string, Module>,
    defaultModels: {
        user: mongoose.Model,
        guild: mongoose.Model
    }

    on<K extends keyof ExtendedClientEvents>(event: K, listener: (...args: ExtendedClientEvents[K]) => Awaitable<void>): this;
    on<S extends string | symbol>(
        event: Exclude<S, keyof ExtendedClientEvents>,
        listener: (...args: any[]) => Awaitable<void>,
    ): this;

    once<K extends keyof ExtendedClientEvents>(event: K, listener: (...args: ExtendedClientEvents[K]) => Awaitable<void>): this;
    once<S extends string | symbol>(
        event: Exclude<S, keyof ExtendedClientEvents>,
        listener: (...args: any[]) => Awaitable<void>,
    ): this;

     emit<K extends keyof ExtendedClientEvents>(event: K, ...args: ExtendedClientEvents[K]): boolean;
     emit<S extends string | symbol>(event: Exclude<S, keyof ExtendedClientEvents>, ...args: unknown[]): boolean;

     off<K extends keyof ExtendedClientEvents>(event: K, listener: (...args: ExtendedClientEvents[K]) => Awaitable<void>): this;
     off<S extends string | symbol>(
        event: Exclude<S, keyof ExtendedClientEvents>,
        listener: (...args: any[]) => Awaitable<void>,
    ): this;
     removeAllListeners<K extends keyof ExtendedClientEvents>(event?: K): this;
     removeAllListeners<S extends string | symbol>(event?: Exclude<S, keyof ExtendedClientEvents>): this;

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
        user: Array<[string, { type: string, default?: any, ref?: string }]>,
        guild: Array<[string, { type: string, default?: any, ref?: string }]>
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
    initFunc: (client: ExtendedClient, moduleLogger: Logger) => Promise<BaseModuleInterfacer>,
    data: manifest,
    commands?: CommandsMap,
    interfacer: BaseModuleInterfacer
}

export interface ExtendedClientEvents extends ClientEvents {
    roleAdded: [
        member: User,
        role: Role
    ];
    roleRemoved: [
        member: User,
        role: Role
    ];
    joinedVoiceChannel: [
        member: User,
        channel: VoiceChannel
    ];
    leftVoiceChannel: [
        member: User,
        channel: VoiceChannel
    ];
    movedVoiceChannel: [
        member: User,
        oldChannel: VoiceChannel,
        newChannel: VoiceChannel
    ];
    newBoosterMember: [
        member: User
    ];
}


interface Event {
    readonly event: keyof ExtendedClientEvents,
    readonly func: (client: Client, logger: Logger, ...args: any[]) => void
}

interface CommandArgs {
    client: ExtendedClient,
    logger: Logger,
    message: Message,
    profile: User,
    args: Array
}

interface Command {
    readonly name: string,
    readonly aliases: Array<string>,
    readonly description: string,
    readonly howToUse: string,

    logger?: Logger,
    readonly func:([any]:CommandArgs) => void

}