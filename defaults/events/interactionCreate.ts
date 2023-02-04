import { Event } from "../../types";
import {CommandInteraction, Interaction} from "discord.js";

export const event: Event = {
    event: 'interactionCreate',
    func: async (client, logger, interaction: Interaction) => {
        if (!interaction.inGuild()) return;
        if (interaction.isCommand()) {
            const command = client.commands.slash.get(interaction.commandName);
            if (!command) return;
            try {
                await command.func({
                    client,
                    logger: command.logger || logger.child({ fallback: true }),
                    interaction,
                    profile: await client.profileHandler.fetchOrCreate(interaction.user.id, interaction.guildId),
                    guild: await client.guildHandler.fetchOrCreate(interaction.guildId)
                });
            } catch (error) {
                logger.error(error);
                await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
            }
        }
    }
}