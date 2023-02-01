import {Client} from "discord.js";
import {Logger} from "winston";
import {BaseModuleInterfacer} from "../../types";


module.exports = async (client: Client, logger: Logger): Promise<BaseModuleInterfacer> => {
    logger.notice(`Initializing module cu`);
    return new class cu implements BaseModuleInterfacer {
        constructor(logger: Logger) {
            logger.notice(`cu module initialized`);
        }
        async cu(message: string): Promise<string> {
            return message;
        }
    }(logger);
}