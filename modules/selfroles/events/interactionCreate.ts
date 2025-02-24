import {Event} from "../../../types";
import { GuildMember,
} from "discord.js";
import {Preset} from "../types";

export const event: Event<'interactionCreate'> = {
    event: 'interactionCreate',
    func: async (client, logger, interaction) => {
        if (interaction.isStringSelectMenu() && interaction.inGuild()) {
            const split = interaction.customId.split('-')
            if (split[0] === 'selfRoles') {
                const presetName = split[1]
                const categoryName = split[2]

                const data = interaction.values[0]

                const guild = await client.guildHandler.fetchOrCreate(interaction.guildId as string)

                const selfRolesSetting = guild.settings.get('selfRolePresets')?.value as Preset[] | undefined
                if (!selfRolesSetting) return interaction.reply('Nenhum preset encontrado')
                const preset = selfRolesSetting.find(preset => preset.name === presetName)
                if (!preset) return interaction.reply('Preset não encontrado')
                const category = preset.categories.find(category => category.name === categoryName)
                if (!category) return interaction.reply('Categoria não encontrada')
                const rolesToRemove = category.roles.filter(role => role.role.id !== data).map(role => role.role.id)
                const member = interaction.member as GuildMember
                await member.roles.remove(rolesToRemove)
                await member.roles.add(data)
                await interaction.reply({
                    content: `Cargos atualizados com sucesso`,
                    ephemeral: true
                })
            }
        }
    }
}