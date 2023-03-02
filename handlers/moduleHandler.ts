import * as discord from "discord.js";
import * as fs from "fs";
import * as path from "path";
import winston, {Logger} from "winston";
import {
    BaseModuleInterfacer,
    CommandsMap,
    ExtendedClient, GenericOption,
    Manifest,
    Module,
    mongoseSchemaData,
    RawManifest
} from "../types";
import eventHandler from "./eventHandler";
import commandHandler from "./commandHandler";
import settingsHandler from "./settingsHandler";
import SlashCommand from "../classes/structs/SlashCommand";
import Command from "../classes/structs/Command";
import {Schema} from "mongoose";

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function loadModules(logger: winston.Logger, client: ExtendedClient): Promise<{
    userData: mongoseSchemaData,
    guildData: mongoseSchemaData,
    modules: discord.Collection<string, Module>
}> {
    const guildObj: mongoseSchemaData = {
        id: {type: String, required: true},
        settings: [{ id: {type: String, required: true}, value: {type: String, required: true} }]
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
                const partialManifest: Partial<Manifest> = rawManifest
                if (rawManifest.schemaDataFile) {
                    const imports = await import(`../modules/${folder}/${rawManifest.schemaDataFile}`);
                    if (imports.user) {
                        userObj[rawManifest.name] = imports.user;
                    }
                    if (imports.guild) {
                        guildObj[rawManifest.name] = imports.guild;
                    }
                    partialManifest.data = imports;
                }
                if (rawManifest.settings) {
                    partialManifest.settings = await settingsHandler(client, rawManifest.settings, logger.child({ service: `Settings loader`, hexColor: `#ffff00` }), partialManifest, folder);

                }
                const manifest = partialManifest as Manifest;
                await logger.notice(`Loaded manifest.json sucessfully in ${folder}`);
                if (manifest.data?.user) {
                    userObj[manifest.name] = manifest.data.user;
                }
                if (manifest.data?.guild) {
                    guildObj[manifest.name] = manifest.data.guild;
                }
                const initFilePath = path.join(folderPath, manifest.initFile);
                fs.readFileSync(initFilePath, 'utf8')
                const init: (client: ExtendedClient, moduleLogger: Logger) => Promise<BaseModuleInterfacer> = require(`../modules/${folder}/${manifest.initFile}`);
                const moduleLogger = logger.child({service: manifest.name, hexColor: manifest.color});
                await init(client, moduleLogger).then(async (Class) => {
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
                        interfacer: Class,
                        settings: manifest.settings as GenericOption[]
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
                    await logger.notice(`Module ${manifest.name} loaded`);
                })
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
                },
                settings: [],
                settingsFunctions: []
            },
            commands: undefined,
            interfacer: defaultModuleInterfacer,
            initFunc: async () => {
                return defaultModuleInterfacer
            },
            settings: []
        }
        await eventHandler(client, defaultModule);
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
    }
    await sleep(500)
    return {
        userData: userObj,
        guildData: guildObj,
        modules
    }
}