import mongoose, {Schema} from "mongoose";
import winston, {Logger} from "winston";
import {
    AutocompleteInteraction,
    Channel,
    ChatInputCommandInteraction,
    Client,
    ClientEvents,
    Collection,
    GuildMember,
    Message,
    Role,
    SlashCommandBuilder,
    VoiceState,
    Guild as DiscordGuild, APIEmbed, BaseMessageOptions
} from "discord.js";
import ProfileManager from "./classes/managers/UserManager";
import GuildManager from "./classes/managers/GuildManager"
import User from "./classes/structs/User";
import {Awaitable} from "@discordjs/util";
import Guild from "./classes/structs/Guild";
import Command from "./classes/structs/Command";
import SlashCommand from "./classes/structs/SlashCommand";
import SlashManager from "./classes/managers/SlashManager";
import SettingsManager from "./classes/managers/SettingsManager";
import {InteractionView} from "./utils/InteractionView";
import {MessageView} from "./utils/MessageView";
import {Setting} from "./settings/Setting";

type configFunc = (args: {
    client: ExtendedClient,
    logger: Logger,
    oldConfig: GenericOption,
    newConfig: GenericOption
}) => Promise<true | { err: boolean, reason: string }>;

type EncodableJSON = string | {
    toString(): string;
}

type ConfigOption = SettingStructure

/*
{
    name: string,
    description?: string,
    eventName: string,
    permission?: PermissionResolvable,
    value?: string,
    default?: string,
} | {
    name: string,
    description?: string,
    eventName: string,
    permission?: PermissionResolvable,
    value: EncodableJSON<any>,
    default?: string,
}
 */
class BaseModuleInterfacer {
    [key: string]: any;
}

interface CommandConstructor {
    name: string,
    aliases: Array<string>,
    description: string,
    howToUse: string,
    func: (args: CommandArgs) => void
}

interface SlashCommandConstructor {
    data: SlashCommandBuilder | Omit<SlashCommandBuilder, "addBooleanOption" | "addUserOption" | "addChannelOption" | "addRoleOption" | "addAttachmentOption" | "addMentionableOption" | "addStringOption" | "addIntegerOption" | "addNumberOption"> | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">,
    func: (args: SlashCommandArgs) => void,
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
type MiddlewareArgs = {
    client: ExtendedClient,
    logger: Logger,
    profile: User,
    guild: Guild,
    interfacer: BaseModuleInterfacer,
    command: Command | SlashCommand,
}

interface ExtendedClient extends Client {
    logger: Logger;

    commands: CommandsMap;

    typesCollection: Collection<string, typeFile>;

    profileHandler: ProfileManager;

    guildHandler: GuildManager;

    slashHandler: SlashManager;

    commandMiddleware: ((args: MiddlewareArgs) => Promise<boolean>)[];

    modules: Collection<string, Module>;
    defaultModels: {
        user: mongoose.Model<any>,
        guild: mongoose.Model<any>
    };
    settingsHandler: SettingsManager;
    cachedEvents: Collection<string, Event<any>[]>;

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

    addMiddleware(func: (args: MiddlewareArgs) => Promise<boolean>): void;
}

interface mongoseSchemaData {
    [key: string]: mongoose.SchemaDefinitionProperty
}

interface Manifest extends RawManifest {
    data: {
        user?: Schema,
        guild?: Schema
    }
}

interface RawManifest {
    name: string,
    description: string,
    version: string,
    color: string,
    schemaDataFile?: string,
    initFile: string,
    eventsFolder: string,
    commandsFolder: string,
    configUpdateFile?: string
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
    interfacer: BaseModuleInterfacer,
    settings: Setting<any>[]
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
    tick: [],
    fullyReady: [],
    dbReady: []
}


interface Event<K extends keyof ExtendedClientEvents> {
    readonly event: K,
    readonly func: (client: ExtendedClient, logger: Logger, ...args: ExtendedClientEvents[K]) => void
}

interface DynamicEvent {
    readonly event: string,
    readonly func: (client: ExtendedClient, logger: Logger, ...args: any[]) => void
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

type Options = {
    text: string,
    number: number,
    boolean: boolean,
    role: string,
    channel: string,
    user: string,
    button: boolean,
    select: Array<string>,
    list: Array<{
        id: string,
        value: PrimitiveOptions[keyof PrimitiveOptions]
    }>,
    object: Array<{
        id: string,
        value: PrimitiveOptions[keyof PrimitiveOptions]
    }>
}
type ReturnOptions = {
    text: string,
    number: number,
    boolean: boolean,
    role: Role,
    channel: Channel,
    user: User,
    button: boolean,
    select: Array<string>,
    list: Array<Options["list"]>,
    object: Array<{ id: string, value: PrimitiveOptions[keyof PrimitiveOptions] }> // GenericPrimitiveOption<keyof Omit<PrimitiveOptions, 'object'>>
}
type PrimitiveOptions = Omit<Options, "select" | "list" | "button" | "object">
type GenericPrimitiveOption<K extends keyof PrimitiveOptions> = {
    name: string,
    id: string,
    description: string,
    default?: Options[K],
    type: K,
    value?: ReturnOptions[K],
    updateFunction?: configFunc
}
type GenericOption =
    GenericPrimitiveOption<keyof PrimitiveOptions>
    | SelectOption
    | ListOption
    | ObjectOption
    | ButtonOption

type ObjectOption = {
    name: string,
    id: string,
    description: string,
    type: "object",
    structure: Array<Omit<GenericPrimitiveOption<keyof PrimitiveOptions>, "default">>,
    default?: Options["object"],
    value?: Options["object"],
    updateFunction?: configFunc
}
type ButtonOption = {
    name: string,
    id: string,
    description: string,
    type: "button",
    default?: Options["button"],
    value?: ReturnOptions["button"],
    updateFunction?: configFunc
}


type SelectOption = {
    name: string,
    id: string,
    description: string,
    max: number, // 0 = all
    min: number, // cant be 0 or below
    type: "select",
    default?: Options["select"],
    value?: ReturnOptions["select"],
    options: Array<{
        id: string,
        value: string,
        name: string,
    }>,
    updateFunction?: configFunc
}

type ListOption = {
    name: string,
    id: string,
    description: string,
    type: "list",
    value?: Array<Options["list"]>,
    structure: Array<Omit<GenericPrimitiveOption<keyof PrimitiveOptions>, "default">>,
    default?: Array<Options["list"]>,
    updateFunction?: configFunc
}

type SettingStructureBaseTypes = "string" | "number" | "boolean" | "embed"
type SettingStructureTypesAdditions = "arr"
type SettingStructureTypesFullNonComplex =
    `${SettingStructureBaseTypes}-${SettingStructureTypesAdditions}`
    | SettingStructureBaseTypes

type SchemaSetting = {
    name: string,
    type: SettingStructureTypesFullNonComplex,
    description: string,
} | SchemaComplexSetting  | SchemaCustomSetting
type SchemaCustomSetting = {
    name: string,
    type: Exclude<string, SettingStructureTypesFullNonComplex | "complex" | "complex-arr">
    description: string,
    metadata?: any
}
type SchemaComplexSetting = {
    name: string,
    type: "complex" | "complex-arr",
    embed: any
    schema: {
        [key: string]: SchemaSetting
    },
    description: string,
    metadata: (value: any) => string | undefined // This is a function for defining fields in the metadata embed
}
type ComplexSetting = {
    name: string,
    description: string,
    type: "complex" | "complex-arr"
    embed: any
    schema: {
        [key: string]: SchemaSetting
    }
    default?: any,
    permission: bigint
}
type CustomSetting = {
    name: string,
    type: Exclude<string, SettingStructureTypesFullNonComplex | "complex" | "complex-arr">
    description: string,
    default?: any,
    permission: bigint,
    metadata?: any
}
type SettingStructure = {
    name: string
    description: string
    type: SettingStructureTypesFullNonComplex
    default?: any,
    permission: bigint
} | ComplexSetting | CustomSetting


type SavedSetting = {
    name: string,
    value: any,
    permission: bigint,
    type: SettingStructureTypesFullNonComplex | "complex" | "complex-arr" | Exclude<string, SettingStructureTypesFullNonComplex | "complex" | "complex-arr">,
    struc: SettingStructure
    metadata?: any
}
type DbSetting = {
    name: string,
    value: any
}
type typeFile = {
    name: string,
    complex: boolean,
    run: (view: InteractionView, types: typeFile[], currentConfig: SavedSetting, metadata?: any | undefined) => any,
    parse?: (config: string, client: ExtendedClient, guildData: any, guild: DiscordGuild) => any,
    parseSettingToArrayFields?: (value: any) => string,
}

type MessageViewUpdate = BaseMessageOptions

type AnyView = MessageView | InteractionView