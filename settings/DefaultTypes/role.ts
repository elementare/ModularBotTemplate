import {
    ActionRowBuilder,
    EmbedBuilder,Role,
    RoleSelectMenuBuilder,
    RoleSelectMenuInteraction
} from "discord.js";
import {SavedSetting, typeFile} from "../../types";
import {InteractionView} from "../../utils/InteractionView";

export default {
    name: 'role',
    complex: true,
    run: (view: InteractionView, types: typeFile[], currentConfig: SavedSetting, metadata) => {
        return new Promise(async (resolve, reject) => {
            const roleSelectMenu = new RoleSelectMenuBuilder()
                .setMaxValues(metadata?.max || 1)
                .setMinValues(metadata?.min || 1)
                .setPlaceholder(metadata?.placeholder || 'Selecione um canal')
                .setCustomId('select')
            const row = new ActionRowBuilder<RoleSelectMenuBuilder>()
                .setComponents([roleSelectMenu])
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${currentConfig.name}`)
                .setDescription(metadata?.description || 'Selecione um cargo')
                .setColor(`#ffffff`)
            await view.update({
                embeds: [embed],
                components: [row],
            })
            view.on('select', async (interaction: RoleSelectMenuInteraction) => {
                await interaction.deferUpdate()
                embed.setDescription(`Cargo selecionado: <@&${interaction.values[0]}>`)
                await view.update({
                    embeds: [embed],
                    components: []
                })
                resolve(interaction.roles.first()?.id)
            })
            view.once('end', (reason) => {
                if (reason !== 'time') return
                view.update({
                    embeds: [],
                    components: [],
                    content: 'Tempo esgotado'
                })
                reject()
            })
        })
    },
    parse: async (config, client, guildData, guild) => {
        return await guild.roles.fetch(JSON.parse(config)).catch(() => undefined)
    },
    parseSettingToArrayFields: (value: Role) => {
        return `Nome: ${value.name}\nMenção: <@&${value.id}>`
    }
} as typeFile