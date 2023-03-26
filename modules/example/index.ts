import {Client} from "discord.js";
import {Logger} from "winston";
import {BaseModuleInterfacer, ConfigOption} from "../../types";


module.exports = async (client: Client, logger: Logger): Promise<{
    interfacer: BaseModuleInterfacer,
    settings: Array<ConfigOption>
}> => {
    logger.notice(`Initializing module`);
    const interfacer = new class Interfacer implements BaseModuleInterfacer {
        constructor(logger: Logger) {
            logger.notice(`Interfacer initialized`);
        }

    }(logger);
    const settings: Array<ConfigOption> = [
        {
            name: 'example',
            description: 'Example setting',
            eventName: 'example'
        }
        ]
    return {
        interfacer: interfacer,
        settings: settings
    }
}