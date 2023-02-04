import {SlashCommandBuilder} from "discord.js";
import {SlashCommandArgs, SlashCommandConstructor} from "../../types";
import {Logger} from "winston";

export default class SlashCommand {
    public readonly data: SlashCommandBuilder;
    public readonly func: (args: SlashCommandArgs) => void;
    public logger?: Logger;

    public global: boolean;
    constructor({ data, func, global }: SlashCommandConstructor) {
        this.data = data;
        this.func = func;
        this.global = global || false;
    }
}