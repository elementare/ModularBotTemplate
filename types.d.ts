import mongoose, {Schema} from "mongoose";
import winston, {Logger} from "winston";
import {
    AutocompleteInteraction, ChatInputCommandInteraction,
    Client,
    ClientEvents,
    Collection, GuildMember,
    Message,
    Role,
    SlashCommandBuilder,
    VoiceState
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
    data: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">,
    func: (args:SlashCommandArgs) => void,
    global?: boolean,
    autoCompleteFunc?: (args: SlashCommandAutoCompleteArgs) => void

}

interface SlashCommandArgs {
    client: ExtendedClient,
    logger: Logger,
    interaction: ChatInputCommandInteraction,
    profile: User,
    guild: Guild,
    interfacer: BaseModuleInterfacer
}

interface SlashCommandAutoCompleteArgs {
    client: ExtendedClient,
    logger: Logger,
    interaction: AutocompleteInteraction,
    profile: User,
    guild: Guild,
    interfacer: BaseModuleInterfacer
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

interface Manifest {
    name: string,
    description: string,
    version: string,
    color: string,
    schemaDataFile?: string,
    data?: {
        user?: Schema,
        guild?: Schema
    },
    initFile: string,
    eventsFolder: string,
    commandsFolder: string
}

interface RawManifest {
    name: string,
    description: string,
    version: string,
    color: string,
    schemaDataFile?: string,
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
    data: Manifest,
    commands?: CommandsMap,
    interfacer: BaseModuleInterfacer
}

export interface ExtendedClientEvents extends ClientEvents {
    roleAdded: [
        member: GuildMember,
        role: Role
    ];
    roleRemoved: [
        member: GuildMember,
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
        member: GuildMember
    ];
}


interface Event<K extends keyof ExtendedClientEvents> {
    readonly event: K,
    readonly func: (client: ExtendedClient, logger: Logger, ...args: ExtendedClientEvents[K]) => void
}

interface CommandArgs {
    client: ExtendedClient,
    logger: Logger,
    message: Message,
    profile: User,
    args: Array,
    guild: Guild,
    interfacer: BaseModuleInterfacer
}