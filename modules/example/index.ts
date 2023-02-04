import {Client} from "discord.js";
import {Logger} from "winston";
import {BaseModuleInterfacer} from "../../types";


module.exports = async (client: Client, logger: Logger): Promise<BaseModuleInterfacer> => {
    logger.notice(`Initializing module`);
    return new class Interfacer implements BaseModuleInterfacer {
        constructor(logger: Logger) {
            logger.notice(`Interfacer initialized`);
        }

        async msg(message: string): Promise<string> {
            return message;
        }
    }(logger);
}