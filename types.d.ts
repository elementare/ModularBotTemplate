import mongoose from "mongoose";
import winston, {Logger} from "winston";
import {
    Client,
    ClientEvents,
    Collection, CommandInteraction,
    Message,
    Role,
    SlashCommandBuilder,
    VoiceChannel, VoiceState
} from "discord.js";
import ProfileManager from "./classes/managers/ProfileManager";
import GuildManager from "./classes/managers/GuildManager"
import User from "./classes/structs/User";
import {Awaitable} from "@discordjs/util";
import Guild from "./classes/structs/Guild";
import Command from "./classes/structs/Command";
import SlashCommand from "./classes/structs/SlashCommand";
import SlashManager from "./classes/managers/SlashManager";

class BaseModuleInterfacer {
    [key: string]: any;
}

interface CommandConstructor {
    name: string,
    aliases: Array<string>,
    description: string,
    howToUse: string,
    func: (args:CommandArgs) => void
}
interface SlashCommandConstructor {
    data: SlashCommandBuilder,
    func: (args:SlashCommandArgs) => void,
    global?: boolean

}

interface SlashCommandArgs {
    client: ExtendedClient,
    logger: Logger,
    interaction: CommandInteraction,
    profile: User,
    guild: Guild
}

interface ExtendedClient extends Client {
    logger: Logger;
    commands: CommandsMap;

    profileHandler: ProfileManager;

    guildHandler: GuildManager;

    slashHandler: SlashManager;

    modules: Collection<string, Module>,
    defaultModels: {
        user: mongoose.Model<any>,
        guild: mongoose.Model<any>
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
type CommandsMap = {
    slash: Collection<string, SlashCommand>,
    text: Collection<string, Command>
}
interface Module {
    name: string,
    folderName: string,
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
        state: VoiceState
    ];
    leftVoiceChannel: [
        state: VoiceState
    ];
    movedVoiceChannel: [
        oldState: VoiceState,
        newState: VoiceState
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
    args: Array,
    guild: Guild
}