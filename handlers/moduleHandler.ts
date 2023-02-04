import * as discord from "discord.js";
import * as fs from "fs";
import * as path from "path";
import winston, {Logger} from "winston";
import {BaseModuleInterfacer, CommandsMap, ExtendedClient, manifest, Module, mongoseSchemaData} from "../types";
import eventHandler from "./eventHandler";
import commandHandler from "./commandHandler";
import messageHandler from './handleMessage'
import SlashCommand from "../classes/structs/SlashCommand";
import Command from "../classes/structs/Command";

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function loadModules(logger: winston.Logger, client: ExtendedClient): Promise<{
    userData: mongoseSchemaData,
    guildData: mongoseSchemaData,
    modules: discord.Collection<string, Module>
}> {
    const guildObj: mongoseSchemaData = {
        id: {type: String, required: true}
    }
    const userObj: mongoseSchemaData = {
        id: {type: String, required: true},
        guildId: {type: String, required: true}
    }

    await logger.notice('Loading modules...');
    const modulesPath = path.join('./modules');
    const modules = new discord.Collection<string, Module>();

    fs.readdir(modulesPath, async (err, folders) => {
        if (err) {
            await logger.emerg(`Error reading modules folder: ${err}`);
            return;
        }
        await logger.notice(`Found ${folders.length} modules`);
        // Modules Setup
        let commands = {
            slash: new discord.Collection<string, SlashCommand>(),
            text: new discord.Collection<string, Command>()
        }
        for (const folder of folders) {
            await logger.notice(`Loading module folder ${folder}`);
            const folderPath = path.join(modulesPath, folder);
            const files = fs.readdirSync(folderPath);
            for (const file of files) {
                if (file === 'manifest.json') {
                    const manifestPath = path.join(folderPath, file);
                    const data = fs.readFileSync(manifestPath, 'utf8');
                    const manifest: manifest = JSON.parse(data);
                    if (!manifest.name) throw new Error(`No name found in manifest.json in ${folder}`);
                    if (!manifest.description) throw new Error(`No description found in manifest.json in ${folder}`);
                    if (!manifest.version) throw new Error(`No version found in manifest.json in ${folder}`);
                    if (!manifest.color) throw new Error(`No color found in manifest.json in ${folder}`);
                    if (!manifest.eventsFolder && !manifest.commandsFolder) throw new Error(`No commands or events found in manifest.json in ${folder}`);
                    if (manifest.data.user) {
                        for (const dataPoint of manifest.data.user) {
                            if (!dataPoint[0]) throw new Error(`No name found in user data point in manifest.json in ${folder}`);
                            if (!dataPoint[1]) throw new Error(`No type found in user data point in manifest.json in ${folder}`);
                            if (!['String', 'Number', 'Boolean', 'Object', 'Array', 'mongoose.types.ObjectId'].includes(dataPoint[1].type)) throw new Error(`Invalid type found in user data point in manifest.json in ${folder}`);
                            const dataPointName = dataPoint[0];
                            if (userObj[dataPointName]) {
                                await logger.warning(`Data point ${dataPoint} already exists in user data points`);
                                continue
                            }
                            if (dataPoint[1].type === 'mongoose.types.ObjectId' && !dataPoint[1].ref) throw new Error(`No ref found in user data point "${dataPointName}" in manifest.json in ${folder}`);

                            const a: {
                                type: any,
                                required: boolean,
                                default: any,
                                ref?: string
                            } = {
                                type: eval(dataPoint[1].type),
                                required: false,
                                default: dataPoint[1].default
                            }
                            if (dataPoint[1].ref) a.ref = dataPoint[1].ref;
                            userObj[dataPointName] = a
                        }
                    }
                    if (manifest.data.guild) {
                        for (const dataPoint of manifest.data.guild) {
                            if (!dataPoint[0]) throw new Error(`No name found in guild data point in manifest.json in ${folder}`);
                            if (!dataPoint[1]) throw new Error(`No type found in guild data point in manifest.json in ${folder}`);
                            if (!['String', 'Number', 'Boolean', 'Object', 'Array', 'mongoose.types.ObjectId'].includes(dataPoint[1].type)) throw new Error(`Invalid type found in guild data point in manifest.json in ${folder}`);
                            const dataPointName = dataPoint[0];
                            if (guildObj[dataPointName]) {
                                await logger.warning(`Data point ${dataPoint} already exists in guild data points`);
                                continue
                            }
                            if (dataPoint[1].type === 'mongoose.types.ObjectId' && !dataPoint[1].ref) throw new Error(`No ref found in guild data point "${dataPointName}" in manifest.json in ${folder}`);

                            const a: {
                                type: any,
                                required: boolean,
                                default: any,
                                ref?: string
                            } = {
                                type: eval(dataPoint[1].type),
                                required: false,
                                default: dataPoint[1].default
                            }
                            if (dataPoint[1].ref) a.ref = dataPoint[1].ref;
                            guildObj[dataPointName] = a
                        }
                    }
                    await logger.notice(`Loaded manifest.json in ${folder}`);
                    const initFilePath = path.join(folderPath, manifest.initFile);
                    fs.readFileSync(initFilePath, 'utf8')
                    const init: (client: ExtendedClient, moduleLogger: Logger) => Promise<BaseModuleInterfacer> = require(`../modules/${folder}/${manifest.initFile}`);
                    const moduleLogger = logger.child({service: manifest.name, hexColor: manifest.color});
                    await init(client, moduleLogger).then(async (Class) => {
                        await logger.notice(`Module ${manifest.name} loaded`);
                        const module: Module = {
                            name: manifest.name,
                            folderName: folder,
                            description: manifest.description,
                            version: manifest.version,
                            color: manifest.color,
                            logger: moduleLogger,
                            initFunc: init,
                            data: manifest,
                            commands: undefined,
                            interfacer: Class
                        }
                        // Module instanciated, now load commands and events
                        if (manifest.eventsFolder) {
                            await eventHandler(client, module);
                        }
                        if (manifest.commandsFolder) {
                            module.commands = await commandHandler(client, module) as CommandsMap
                            for (const command of module.commands.text) {
                                commands.text.set(command[1].name, command[1]);
                            }
                            for (const command of module.commands.slash) {
                                commands.slash.set(command[1].data.name, command[1]);
                            }
                        }
                        modules.set(manifest.name, module)
                    })
                }
            }
        }
        await logger.notice('Modules loaded');
        await logger.notice('Setting up commands...');
        await logger.notice(`Text commands List: ${commands.text.map((command) => `${command.name}`).join(', ')}`)
        await logger.notice(`Slash commands List: ${commands.slash.map((command) => `${command.data.name}`).join(', ')}`)
        client.commands = commands;
        client.modules = modules;
        client.on('messageCreate', messageHandler.bind(null, client, commands));
        await logger.notice('Commands and modules setup, loading defaults...');
        const defaultModuleInterfacer = new class Interfacer implements BaseModuleInterfacer {

        }()

        const defaultModule: Module = {
            name: 'Default',
            folderName: 'default',
            description: 'Default module',
            version: '1.0.0',
            color: '#000000',
            logger: logger.child({service: 'Default', hexColor: '#000000'}),
            data: {
                name: 'Default',
                description: 'Default module',
                version: '1.0.0',
                color: '#000000',
                initFile: 'init.js',
                commandsFolder: 'commands',
                eventsFolder: 'events',
                data: {
                    user: [],
                    guild: []
                }
            },
            commands: undefined,
            interfacer: defaultModuleInterfacer,
            initFunc: async (client: ExtendedClient, logger: Logger) => {
                return defaultModuleInterfacer
            }
        }
        await eventHandler(client, defaultModule);
        defaultModule.commands = await commandHandler(client, defaultModule) as CommandsMap
        for (const command of defaultModule.commands.text) {
            commands.text.set(command[1].name, command[1]);
        }
        for (const command of defaultModule.commands.slash) {
            commands.slash.set(command[1].data.name, command[1]);
        }
        await logger.notice('Defaults loaded');
        await logger.notice('Registering global commands...');
        await client.slashHandler.registerGlobalCommands();
        await logger.notice('Global commands registered');
    });
    await sleep(500)
    return {
        userData: userObj,
        guildData: guildObj,
        modules
    }
}