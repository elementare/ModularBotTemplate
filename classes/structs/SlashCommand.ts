import {SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder} from "discord.js";
import {
    BaseCommandConstructor,
    SlashCommandArgs,
    SlashCommandAutoCompleteArgs,
    SlashCommandConstructor
} from "../../types";
import {Logger} from "winston";

export default class SlashCommand implements BaseCommandConstructor {
    public readonly data: SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup"> | Omit<SlashCommandBuilder, "addBooleanOption" | "addUserOption" | "addChannelOption" | "addRoleOption" | "addAttachmentOption" | "addMentionableOption" | "addStringOption" | "addIntegerOption" | "addNumberOption">;
    public readonly func: (args: SlashCommandArgs) => void;
    public logger?: Logger;

    public global: boolean;
    public module?: string;

    public disabled?: boolean;
    public appearsInHelp: boolean = true;

    public autoCompleteFunc?: (args: SlashCommandAutoCompleteArgs) => void;
    constructor({ data, func, global, autoCompleteFunc }: SlashCommandConstructor) {
        this.data = data;
        this.func = func;
        this.global = global || false;
        this.autoCompleteFunc = autoCompleteFunc;
    }

    get shouldAppearInHelp(): boolean {
        return this.appearsInHelp && !this.disabled;
    }
}