import * as fs from 'fs';
import * as path from 'path';
import {Logger} from "winston";
import {Event, ExtendedClient, Module} from "../types";

async function findJsFiles(dir: string, logger: Logger): Promise<Array<Event<any>>> {
    let results: Array<Event<any>> = [];
    const list = await fs.promises.readdir(dir);
    logger.info(`Found ${list.length} files in ${dir}`);
    for (const file of list) {
        const filePath = path.resolve(dir, file);
        const stat = await fs.promises.stat(filePath);
        if (stat.isDirectory()) {
            logger.info(`Found directory ${file} in ${dir}`);
            results = results.concat(await findJsFiles(filePath, logger));
        } else if (path.extname(filePath) === '.ts' || path.extname(filePath) === '.js') {
            logger.info(`Found event file ${filePath}`);
            const event = require(filePath)
            results.push(event.event);
        }
    }
    return results;
}


export default async (client: ExtendedClient, module: Module) => {
    const eventLogger = module.logger.child({service: 'Event Loader', hexColor: '#CCAAFF'});
    const eventsByModule: Event<any>[] = []
    if (module.name === 'Default') {
        const files = await findJsFiles(`./defaults/events`, eventLogger);
        /*
        for (const file of files) {
            eventLogger.info(`Loading event ${file.event} from Defaults`);
            client.on(file.event, file.func.bind(null, client, module.logger));
        }
         */
        eventsByModule.push(...files)
        eventLogger.notice(`Loaded ${files.length} default events to the cache, and waiting for the client to be ready`);
    } else {
        const files = await findJsFiles(`${module.path}/${module.data.eventsFolder}`, eventLogger);

        /*
        for (const file of files) {
            eventLogger.info(`Loading event ${file.event} from module ${module.name}`);
            client.on(file.event, file.func.bind(null, client, module.logger));
        }
         */
        eventsByModule.push(...files)
        eventLogger.info(`Loaded ${files.length} events for module ${module.data.name} to the cache, and waiting for the client to be ready`);
    }
    return eventsByModule
}