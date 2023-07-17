import * as discord from "discord.js";
import * as fs from "fs";
import * as path from "path";
import winston, {Logger} from "winston";
import {
    BaseModuleInterfacer,
    CommandsMap, ConfigOption,
    ExtendedClient,
    Manifest,
    Module,
    mongoseSchemaData,
    RawManifest
} from "../types";
import eventHandler from "./eventHandler";
import commandHandler from "./commandHandler";
import SlashCommand from "../classes/structs/SlashCommand";
import Command from "../classes/structs/Command";
import {Schema} from "mongoose";

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startTicks(client: ExtendedClient, logger: Logger) {
    await sleep(5000)
    await logger.notice('Starting ticks...');
    while (true) {
        client.emit('tick');
        await sleep(90000);
    }
}
let dbReady = false;
export async function loadModules(logger: winston.Logger, client: ExtendedClient): Promise<{
    userData: mongoseSchemaData,
    guildData: mongoseSchemaData,
    modules: discord.Collection<string, Module>
}> {
    client.once('dbReady', async () => {
        dbReady = true;
    })
    const guildObj: mongoseSchemaData = {
        id: {type: String, required: true},
        settings: { type: Map, default: new Map() }
    }
    const userObj: mongoseSchemaData = {
        id: {type: String, required: true},
        guildId: {type: String, required: true}
    }

    await logger.notice('Loading modules...');
    const modulesPath = path.join('./modules');
    const modules = new discord.Collection<string, Module>();

    const folders = fs.readdirSync(modulesPath);

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
        logger.info(`Found ${files.length} files in ${folderPath}`);
        for (const file of files) {
            if (file === 'manifest.json') {
                const manifestPath = path.join(folderPath, file);
                const data = fs.readFileSync(manifestPath, 'utf8');
                const rawManifest: RawManifest = JSON.parse(data);
                if (!rawManifest.name) throw new Error(`No name found in manifest.json in ${folder}`);
                if (!rawManifest.description) throw new Error(`No description found in manifest.json in ${folder}`);
                if (!rawManifest.version) throw new Error(`No version found in manifest.json in ${folder}`);
                if (!rawManifest.color) throw new Error(`No color found in manifest.json in ${folder}`);
                if (!rawManifest.eventsFolder && !rawManifest.commandsFolder) throw new Error(`No commands or events found in manifest.json in ${folder}`);
                if (!rawManifest.initFile) throw new Error(`No init file found in manifest.json in ${folder}`);
                const partialManifest: Partial<Manifest> = rawManifest
                if (rawManifest.schemaDataFile) {
                    const fileName = rawManifest.schemaDataFile.split('.')[0];
                    const files = fs.readdirSync(`./modules/${folder}/`)
                    if (!files.includes(`${fileName}.js`) && !files.includes(`${fileName}.ts`)) throw new Error(`Init file ${fileName} does not exist in ${folder}`);
                    if (files.includes(`${fileName}.js`)) rawManifest.schemaDataFile = `${fileName}.js`;
                    if (files.includes(`${fileName}.ts`)) rawManifest.schemaDataFile = `${fileName}.ts`;
                    const imports = await import(`../modules/${folder}/${rawManifest.schemaDataFile}`);
                    if (imports.user) {
                        userObj[rawManifest.name] = imports.user;
                    }
                    if (imports.guild) {
                        guildObj[rawManifest.name] = imports.guild;
                    }
                    partialManifest.data = imports;
                }
                const manifest = partialManifest as Manifest;
                await logger.notice(`Loaded manifest.json sucessfully in ${folder}`);
                if (manifest.data?.user) {
                    userObj[manifest.name] = manifest.data.user;
                }
                if (manifest.data?.guild) {
                    guildObj[manifest.name] = manifest.data.guild;
                }
                // const initFilePath = path.join(folderPath, manifest.initFile);
                // fs.readFileSync(initFilePath, 'utf8')
                const fileName = manifest.initFile.split('.')[0];
                const files = fs.readdirSync(`./modules/${folder}/`)
                if (!files.includes(`${fileName}.js`) && !files.includes(`${fileName}.ts`)) throw new Error(`Init file ${fileName} does not exist in ${folder}`);
                if (files.includes(`${fileName}.js`)) manifest.initFile = `${fileName}.js`;
                if (files.includes(`${fileName}.ts`)) manifest.initFile = `${fileName}.ts`;
                const init: (client: ExtendedClient, moduleLogger: Logger) => Promise<{
                    interfacer?: BaseModuleInterfacer,
                    settings?: ConfigOption[]
                }> = require(`../modules/${folder}/${manifest.initFile}`);
                const moduleLogger = logger.child({service: manifest.name, hexColor: manifest.color});
                await init(client, moduleLogger).then(async ({ interfacer, settings}) => {
                    if (!interfacer) interfacer = new class Interfacer implements BaseModuleInterfacer {
                    }()
                    if (!settings) settings = []
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
                        interfacer: interfacer,
                        settings: settings
                    }
                    // Module instanciated, now load commands and events
                    if (manifest.eventsFolder) {
                        client.cachedEvents.set(module.name, await eventHandler(client, module))
                    }
                    if (manifest.commandsFolder) {
                        module.commands = await commandHandler(client, module) as CommandsMap
                        for (const command of module.commands.text) {
                            commands.text.set(command[0], command[1]);
                        }
                        for (const command of module.commands.slash) {
                            commands.slash.set(command[1].data.name, command[1]);
                        }
                    }
                    modules.set(manifest.name, module)
                    await logger.notice(`Module ${manifest.name} loaded`);
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
    await logger.notice('Commands and modules setup, loading defaults...');
    const defaultModuleInterfacer = new class Interfacer implements BaseModuleInterfacer {

    }()

    const defaultModule: Module = {
        name: 'Default',
        folderName: 'default',
        description: 'Default module',
        version: '1.0.0',
        color: '#5000FF',
        logger: logger.child({service: 'Default', hexColor: '#5000FF'}), // To change Module "Default" color, just change the logger directly and don't be dumb like me
        data: {
            name: 'Default',
            description: 'Default module',
            version: '1.0.0',
            color: '#5000FF',
            initFile: 'init.js',
            commandsFolder: 'commands',
            eventsFolder: 'events',
            data: {
                user: new Schema(),
                guild: new Schema()
            }
        },
        commands: undefined,
        interfacer: defaultModuleInterfacer,
        initFunc: async () => {
            return defaultModuleInterfacer
        },
        settings: []
    }
    client.cachedEvents.set(defaultModule.name, await eventHandler(client, defaultModule))
    defaultModule.commands = await commandHandler(client, defaultModule)
    for (const command of defaultModule.commands.text) {
        commands.text.set(command[1].name, command[1]);
    }
    for (const command of defaultModule.commands.slash) {
        commands.slash.set(command[1].data.name, command[1]);
    }
    client.modules.set('Default', defaultModule);
    await logger.notice('Defaults loaded');
    await logger.notice('Registering global commands...');
    await client.slashHandler.registerGlobalCommands();
    await logger.notice('Global commands registered');
    startTicks(client, logger);

    if (dbReady) {
        client.emit('fullyReady')
    } else {
        client.once('dbReady', () => {
            client.emit('fullyReady')
        })
    }

    await sleep(100)
    return {
        userData: userObj,
        guildData: guildObj,
        modules
    }
}