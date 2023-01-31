import {Client, Interaction} from "discord.js";
import {Logger} from "winston";
import { Event} from "../../../../types";

export const event: Event = {
    event: 'interactionCreate',
    func: (client: Client, logger: Logger, interaction: Interaction) => {
        logger.notice(`Interaction created`);
    }
}