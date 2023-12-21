import {InteractionView} from "../utils/InteractionView";
import {ExtendedClient, SavedSetting, typeFile} from "../types";
import {Awaitable} from "@discordjs/util";
import Guild from "../classes/structs/Guild";
import {Guild as DiscordGuild} from "discord.js";

export type SettingValue = string | number | boolean | object | undefined;

export type BaseSettingStructure = {
    name: string;
    description: string;
    permission?: bigint;
}

export interface Setting<T> {
    /*
     * User Defined Settings
     */

    /*
     * The name of the setting
     */
    name: string;
    /*
     * The description of the setting
     */
    description: string;
    /*
     * Permission needed to modify the setting
     */
    permission?: bigint;

    value?: T;



    /*
     * Type Defined Settings
     */

    /*
     * The type of the setting
     */
    type: string;
    /*
     * Whether the setting needs to be parsed in a specific way, using the parse function, or if it can be parsed normally
     */
    complex?: boolean;
    /*
     * Run the type and return setting value
     * Shouldn't be overridden
     */
    run: (view: InteractionView) => Awaitable<T>;
    /*
     * Parse a value to a string to be used in an array type field
     * Can be overridden
     */
    parseToField?: (value: T) => string;
    /*
     * Parse a value to a string to be saved in the database
     * Can be overridden
     */
    save?: (guild: Guild, value: T) => Awaitable<boolean>;
    /*
     * Load a value from the database to be used in instantiating the setting
     * Can be overridden
     */
    load?: (guild: DiscordGuild, guildData: any) => Awaitable<T>;
    /*
     * Parse a value from the database to be used in instantiating the setting
     * Can be overridden
     */
    parse?: (config: string, client: ExtendedClient, guildData: any, guild: DiscordGuild) => Awaitable<T>;
}