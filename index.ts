// Verify .env file is in the same directory as index.ts and contains the token
// pt-br: Verifique se o arquivo .env está no mesmo diretório que o index.ts e contém o token do bot

import * as path from "path";
import * as fs from 'fs';
import * as winston from "winston";
import {loadModules} from "./handlers/moduleHandler";
import chalk = require("chalk");
import mongoose, {ConnectOptions} from "mongoose";

const file = fs.readFileSync('.env', 'utf8');
if (!file) throw new Error('No .env file found or .env file is empty');
if (!file.includes('DISCORD_TOKEN')) throw new Error('No DISCORD_TOKEN found in .env file');
// Configure logger settings
// pt-br: Configura as configurações do logger
function createLogger(service: string, hexColor: string): winston.Logger {
    return winston.createLogger({
        levels: winston.config.syslog.levels,
        level: 'debug',
        transports: [
            new winston.transports.File({
                filename: 'logs/error-complete.log',
                level: 'error',
                format: winston.format.combine(
                    winston.format.json(),
                    winston.format.label({label: path.basename(module.filename)}),
                    winston.format.timestamp(),
                    winston.format.splat()
                )
            }),
            new winston.transports.File({
                filename: 'logs/complete.log',
                format: winston.format.combine(
                    winston.format.json(),
                    winston.format.label({label: path.basename(module.filename)}),
                    winston.format.timestamp(),
                    winston.format.splat()
                )
            }),
            new winston.transports.File({
                filename: 'logs/error-main.log',
                level: 'error',
                format: winston.format.combine(
                    winston.format.json(),
                    winston.format.label({label: path.basename(module.filename)}),
                    winston.format.timestamp(),
                    winston.format.splat()
                )
            }),
            new winston.transports.File({
                filename: 'logs/main.log',
                format: winston.format.combine(
                    winston.format.json(),
                    winston.format.label({label: path.basename(module.filename)}),
                    winston.format.timestamp(),
                    winston.format.splat()
                )
            }),
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.label({label: path.basename(module.filename)}),
                    winston.format.printf(info => `${info.fallback?chalk.red("FALLBACK") + " ":""}${chalk.hex(info.hexColor)(`(${info.service})`)} [${info.label} - ${info.level}] ${info.message}`),
                    winston.format.splat()
                )
            })
        ]
    }).child({service: service, hexColor: hexColor});
}

const logger = createLogger('Main', '#aa00ff');
logger.rejections.handle(
    new winston.transports.File({
        filename: 'logs/rejections-main.log',
        format: winston.format.combine(
            winston.format.json(),
            winston.format.label({label: path.basename(module.filename)}),
            winston.format.timestamp(),
            winston.format.splat()
        )
    }),
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.label({label: path.basename(module.filename)}),
            winston.format.printf(info => `[${info.label} - ${info.level}] ${info.message}`),
            winston.format.splat()
        )
    })
);
logger.exceptions.handle(
    new winston.transports.File({
        filename: 'logs/exceptions-main.log',
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
            winston.format.printf(info => `[${info.label} - ${info.level}] ${info.message}`)
        )
    })
);

logger.notice('Connecting to Discord...');
const discord = require("discord.js");
const client = new discord.Client({intents: 131071});
require('dotenv').config();
import UserHandler from "./classes/managers/UserManager";
import GuildHandler from "./classes/managers/GuildManager";
import SlashManager from "./classes/managers/SlashManager";
import SettingsManager from "./classes/managers/SettingsManager";
import {Collection} from "discord.js";
import {ExtendedClient, Module} from "./types";
client.login(process.env.DISCORD_TOKEN).then(async (): Promise<void> => {
    await logger.notice(`Logged in as ${chalk.hex('#00aaff')(client.user.tag)}`);
    const dbLogger = logger.child({service: `Database`, hexColor: '#33f517'});
    dbLogger.notice('Connecting to MongoDB...');
    mongoose.connect(process.env.MONGODB_SRV as string, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    } as ConnectOptions).then(() => {
        dbLogger.notice("Database was successfully connected")
        client.emit('dbReady');
    }).catch(err => {
        dbLogger.crit(err);
        throw new Error(err);
    });

    client.once('fullyReady', async () => {
        const eClient = client as ExtendedClient;
        eClient.cachedEvents.map(async (event, key) => {

            dbLogger.info(`Loading events for module ${chalk.green(key)}`);
            const module = eClient.modules.get(key) as Module
            for (const listener of event) {
                client.on(listener.event, listener.func.bind(null, client, module.logger));
                dbLogger.info(`Loaded event ${chalk.green(listener.event)} for module ${chalk.green(key)}`);
            }
        })
    })

    client.profileHandler = new UserHandler(client, logger.child({service: 'User Handler', hexColor: '#bbaaff'}));
    client.guildHandler = new GuildHandler(client);
    client.slashHandler = new SlashManager(client);
    client.cachedEvents = new Collection();
    client.settingsHandler = new SettingsManager(client, logger.child({service: 'Settings Manager', hexColor: '#bbaaff'}));
    client.logger = logger;
    logger.info('Profile handler and Guild Handler loaded');
    const {userData, guildData} = await loadModules(logger, client);
    logger.notice('All modules loaded!');
    const keys = Object.keys(userData);
    logger.notice(`User schema has the keys: ${chalk.green(keys.join(', '))}`);
    const guildKeys = Object.keys(guildData);
    logger.notice(`Guild schema has the keys: ${chalk.green(guildKeys.join(', '))}`);
    const userSchema = new mongoose.Schema(userData)
    const guildSchema = new mongoose.Schema(guildData)
    userSchema.plugin(require('mongoose-autopopulate'))
    guildSchema.plugin(require('mongoose-autopopulate'))
    const user = mongoose.model('user', userSchema)
    const guild = mongoose.model('guild', guildSchema)
    logger.notice('MongoDB models updated successfully!')
    client.defaultModels = {
        user,
        guild
    }
})