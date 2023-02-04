import {Client, Collection} from "discord.js";
import {CommandsMap, Module} from "../types";
import {Logger} from "winston";
import path from "path";
import Command from "../classes/structs/Command";
import SlashCommand from "../classes/structs/SlashCommand";

const fs = require('fs');

async function findJsFiles(dir: string, logger: Logger, commandLogger: Logger): Promise<{ slash: Array<SlashCommand>, text: Array<Command>}> {
    let textCommands: Array<Command> = [];
    let slashCommands: Array<SlashCommand> = [];
    const list = await fs.promises.readdir(dir);
    logger.info(`Found ${list.length} files in ${dir}`);
    for (const file of list) {
        const filePath = path.resolve(dir, file);
        const stat = await fs.promises.stat(filePath);
        if (stat.isDirectory()) {
            logger.info(`Found directory ${file} in ${dir}`);
            const { text, slash } = await findJsFiles(filePath, logger, commandLogger)
            textCommands = textCommands.concat(text);
            slashCommands = slashCommands.concat(slash);
        } else if (path.extname(filePath) === '.ts') {
            logger.info(`Found command file ${filePath}`);
            const file: Command | SlashCommand = await import(filePath).then(file => file.default);
            if (file instanceof Command) {
                file.logger = commandLogger;
                textCommands.push(file);
            } else {
                file.logger = commandLogger;
                slashCommands.push(file);
            }
        }
    }
    return { text: textCommands, slash: slashCommands };
}

export default async (client: Client, module: Module):Promise<CommandsMap> => {
    if (module.name === 'Default') {
        const {text, slash} = await findJsFiles(`./defaults/commands`, module.logger.child({ service: 'Command Loader', hexColor: '#CCAAFF' }),module.logger);
        module.logger = module.logger.child({ service: 'Command Loader', hexColor: '#CCAAFF' });
        const commands = {
            slash: new Collection<string, SlashCommand>(),
            text: new Collection<string, Command>()
        }
        for (const file of text) {
            module.logger.info(`Loading command ${file.name} from Defaults`);
            commands.text.set(file.name, file);
            for (const alias of file.aliases) {
                commands.text.set(alias, file);
            }
        }
        for (const file of slash) {
            module.logger.info(`Loading slash command ${file.data.name} from Defaults`);
            commands.slash.set(file.data.name, file);
        }
        return commands;
    } else {
        const {text, slash} = await findJsFiles(`./modules/${module.folderName}/${module.data.commandsFolder}`, module.logger.child({ service: 'Command Loader', hexColor: '#CCAAFF' }), module.logger);
        module.logger = module.logger.child({ service: 'Command Loader', hexColor: '#CCAAFF' });
        const commands = {
            slash: new Collection<string, SlashCommand>(),
            text: new Collection<string, Command>()
        }
        for (const file of text) {
            module.logger.info(`Loading command ${file.name} from module ${module.name}`);
            commands.text.set(file.name, file);
            for (const alias of file.aliases) {
                commands.text.set(alias, file);
            }
        }
        for (const file of slash) {
            module.logger.info(`Loading slash command ${file.data.name} from module ${module.name}`);
            commands.slash.set(file.data.name, file);
        }
        return commands;
    }
}