import {DynamicEvent} from "../../../../types";
import {ChatInputCommandInteraction} from "discord.js";
export const event: DynamicEvent = {
    event: 'example',
    func: async (client, logger, interaction: ChatInputCommandInteraction<"cached" | "raw">) => {
        await interaction.reply('cucucu')
    }
}