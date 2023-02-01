import {Client} from "discord.js";
import {Command, CommandsMap, Module} from "../types";
import {Logger} from "winston";
import path from "path";

const fs = require('fs');

async function findJsFiles(dir: string, logger: Logger): Promise<Array<Command>> {
    let results: Array<Command> = [];
    const list = await fs.promises.readdir(dir);
    logger.info(`Found ${list.length} files in ${dir}`);
    for (const file of list) {
        const filePath = path.resolve(dir, file);
        const stat = await fs.promises.stat(filePath);
        if (stat.isDirectory()) {
            logger.info(`Found directory ${file} in ${dir}`);
            results = results.concat(await findJsFiles(filePath, logger));
        } else if (path.extname(filePath) === '.ts') {
            logger.info(`Found command file ${filePath}`);
            const file = require(filePath)
            file.command.logger = logger;
            results.push(file.command as Command);
        }
    }
    return results;
}

export default async (client: Client, module: Module):Promise<CommandsMap> => {
    const files = await findJsFiles(`./modules/${module.name}/${module.data.commandsFolder}`, module.logger);
    const commands = new Map<string, Command>()
    for (const file of files) {
        module.logger.info(`Loading command ${file.name} from module ${module.name}`);
        commands.set(file.name, file);
        for (const alias of file.aliases) {
            commands.set(alias, file);
        }
    }
    return commands;
}