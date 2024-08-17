import {Event} from "../../types";

export const event: Event<"interactionCreate"> = {
    event: 'interactionCreate',
    func: async (client, logger, interaction) => {
        if (!interaction.inGuild()) return;
        if (interaction.isChatInputCommand()) {
            const command = client.commands.slash.get(interaction.commandName);
            if (!command) return;
            if (!command.logger) command.logger = logger.child({fallback: true});
            if (!command.module) return;
            if (command.disabled) return interaction.reply({content: 'Este comando está desativado temporariamente', ephemeral: true});
            const module = client.modules.get(command.module)
            if (!module) return;
            try {
                for (const middlewareFn of client.commandMiddleware) {
                    const result = await middlewareFn({
                        client,
                        logger: command.logger,
                        profile: await client.profileHandler.fetchOrCreate(interaction.user.id, interaction.guildId),
                        guild: await client.guildHandler.fetchOrCreate(interaction.guildId),
                        interfacer: module.interfacer,
                        command
                    })
                    if (!result) return;
                }
                command.func({
                    client,
                    logger: command.logger,
                    interaction,
                    profile: await client.profileHandler.fetchOrCreate(interaction.user.id, interaction.guildId),
                    guild: await client.guildHandler.fetchOrCreate(interaction.guildId),
                    interfacer: module.interfacer
                });
                client.logger.info(`Command executed: ${command.data.name}`, {
                    command: {
                        name: command.data.name,
                        module: command.module,
                        typedName: command.data.name
                    },
                    guild: {
                        name: interaction.guild?.name,
                        id: interaction.guild?.id
                    },
                    user: {
                        name: interaction.user.username,
                        id: interaction.user.id
                    }
                })
            } catch (error) {
                console.log(error);
                logger.error(error);
                await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
            }
        }
        if (interaction.isAutocomplete()) {
            const command = client.commands.slash.get(interaction.commandName);
            if (!command) return;
            if (!command.logger) command.logger = logger.child({fallback: true});
            if (!command.module) return;
            const module = client.modules.get(command.module)
            if (!module) return;
            if (!command.autoCompleteFunc) return interaction.respond([{
                name: "This command doest not have auto complete set up",
                value: "null"
            }])
            await command.autoCompleteFunc({
                client,
                logger: command.logger,
                interaction,
                profile: await client.profileHandler.fetchOrCreate(interaction.user.id, interaction.guildId),
                guild: await client.guildHandler.fetchOrCreate(interaction.guildId),
                interfacer: module.interfacer
            })

        }
    }
}