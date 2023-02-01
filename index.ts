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
                filename: 'logs/error-main.log',
                level: 'error',
                format: winston.format.combine(
                    winston.format.json(),
                    winston.format.label({label: path.basename(module.filename)}),
                    winston.format.timestamp()
                )
            }),
            new winston.transports.File({
                filename: 'logs/main.log',
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
                    winston.format.printf(info => `${info.fallback?chalk.red("FALLBACK") + " ":""}${chalk.hex(hexColor)(`(${info.service})`)} [${info.label} - ${info.level}] ${info.message}`)
                )
            })
        ]
    });
}

const logger = createLogger('Main', '#aa00ff');
logger.rejections.handle(
    new winston.transports.File({
        filename: 'logs/rejections-main.log',
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
client.login(process.env.DISCORD_TOKEN).then(async (): Promise<void> => {
    await logger.notice(`Logged in as ${chalk.hex('#00aaff')(client.user.tag)}`);
    logger.notice('Connecting to MongoDB...');
    mongoose.connect(process.env.MONGODB_SRV as string, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    } as ConnectOptions).then(() => {
        logger.notice("Database was successfully connected")
    }).catch(err => {
        logger.crit(err);
        throw new Error(err);
    });
    client.profileHandler = new UserHandler(client);
    client.logger = logger;
    logger.info('Profile handler loaded');
    const {userData, guildData} = await loadModules(logger, client);
    logger.notice('All modules loaded!');
    const userSchema = new mongoose.Schema(userData)
    const guildSchema = new mongoose.Schema(guildData)
    const user = mongoose.model('user', userSchema)
    const guild = mongoose.model('guild', guildSchema)
    logger.notice('MongoDB models updated successfully!')
    client.defaultModels = {
        user,
        guild
    }
})