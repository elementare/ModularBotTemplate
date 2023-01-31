import * as discord from "discord.js";
import * as fs from "fs";
import * as path from "path";
import winston from "winston";
import {Command, ExtendedClient, manifest, Module, mongoseSchemaData} from "../types";
import eventHandler from "./event_handler";
import commandHandler from "./command_handler";
import messageHandler from './handleMessage'
import chalk = require("chalk");

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function loadModules(logger: winston.Logger, client: ExtendedClient): Promise<{
    userData: mongoseSchemaData,
    guildData: mongoseSchemaData,
    modules: discord.Collection<string, Module>
}> {
    function createLogger(service: string, hexColor: string): winston.Logger {
        return winston.createLogger({
            levels: winston.config.syslog.levels,
            level: 'debug',
            defaultMeta: {service: service},
            transports: [
                new winston.transports.File({
                    filename: 'logs/error-complete.log',
                    level: 'error',
                    format: winston.format.combine(
                        winston.format.json(),
                        winston.format.label({label: path.basename(module.filename)}),
                        winston.format.timestamp()
                    )
                }),
                new winston.transports.File({
                    filename: 'logs/complete.log',
                    format: winston.format.combine(
                        winston.format.json(),
                        winston.format.label({label: path.basename(module.filename)}),
                        winston.format.timestamp()
                    )
                }),
                new winston.transports.File({
                    filename: 'logs/error-modules.log',
                    level: 'error',
                    format: winston.format.combine(
                        winston.format.json(),
                        winston.format.label({label: path.basename(module.filename)}),
                        winston.format.timestamp()
                    )
                }),
                new winston.transports.File({
                    filename: 'logs/modules.log',
                    format: winston.format.combine(
                        winston.format.json(),
                        winston.format.label({label: path.basename(module.filename)}),
                        winston.format.timestamp()
                    )
                }),
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.label({label: path.basename(module.filename)}),
                        winston.format.printf(info => `${chalk.hex(hexColor)(`(${info.service})`)} [${info.label} - ${info.level}] ${info.message}`)
                    )
                })
            ]
        });
    }


    const guildObj: mongoseSchemaData = {}
    const userObj: mongoseSchemaData = {}

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
        let commands = new Map<string, Command>();
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
                            userObj[dataPointName] = {
                                type: eval(dataPoint[1].type),
                                required: false,
                                default: dataPoint[1].default
                            }
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
                            guildObj[dataPointName] = {
                                type: eval(dataPoint[1].type),
                                required: false,
                                default: dataPoint[1].default
                            }
                        }
                    }
                    await logger.notice(`Loaded manifest.json in ${folder}`);
                    const initFilePath = path.join(folderPath, manifest.initFile);
                    fs.readFileSync(initFilePath, 'utf8')
                    const init = require(`../modules/${folder}/${manifest.initFile}`);
                    const moduleLogger = createLogger(manifest.name, manifest.color);
                    await init(client, moduleLogger).then(async () => {
                        await logger.notice(`Module ${manifest.name} loaded`);
                        const module: Module = {
                            name: manifest.name,
                            description: manifest.description,
                            version: manifest.version,
                            color: manifest.color,
                            logger: moduleLogger,
                            initFunc: init,
                            data: manifest,
                            commands: undefined,
                        }
                        modules.set(manifest.name, module)
                        // Module instanciated, now load commands and events
                        if (manifest.eventsFolder) {
                            await eventHandler(client, module);
                        }
                        if (manifest.commandsFolder) {
                            module.commands = await commandHandler(client, module);
                            modules.set(manifest.name, module)
                            for (const command of module.commands) {
                                commands.set(command[1].name, command[1]);
                            }
                        }
                    })
                }
            }
        }
        await logger.notice('Modules loaded');
        await logger.notice('Setting up commands...');
        client.commands = commands;
        client.modules = modules;
        client.on('messageCreate', messageHandler.bind(null, client, commands));
        await logger.notice('Commands setup');
    });
    await sleep(500)
    return {
        userData: userObj,
        guildData: guildObj,
        modules
    }
}