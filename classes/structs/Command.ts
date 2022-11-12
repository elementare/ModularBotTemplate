import {CommandArgs, CommandConstructor} from "../../types";
import {Logger} from "winston";


export default class Command {
    public readonly name: string;
    public readonly aliases: Array<string>;
    public readonly description: string;
    public readonly howToUse: string;
    public logger?: Logger;
    public readonly func: (args: CommandArgs) => void;
    public module?: string;
    constructor(params: CommandConstructor) {
        this.name = params.name;
        this.aliases = params.aliases;
        this.description = params.description;
        this.howToUse = params.howToUse;
        this.func = params.func;
    }
}