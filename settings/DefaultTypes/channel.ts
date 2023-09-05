import {
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    ChannelSelectMenuInteraction,
    ChannelType,
    DMChannel,
    EmbedBuilder,
    PartialDMChannel,
    TextBasedChannel
} from "discord.js";
import {SavedSetting, typeFile} from "../../types";
import {InteractionView} from "../../utils/InteractionView";

export default {
    name: 'channel',
    complex: true,
    run: (view: InteractionView, types: typeFile[], currentConfig: SavedSetting, metadata) => {
        return new Promise(async (resolve, reject) => {
            const channelSelectMenu = new ChannelSelectMenuBuilder()
                .setMaxValues(metadata?.max || 1)
                .setMinValues(metadata?.min || 1)
                .setPlaceholder(metadata?.placeholder || 'Selecione um canal')
                .setCustomId('select')
                .setChannelTypes(ChannelType.GuildText ?? metadata?.channelTypes)
            const row = new ActionRowBuilder<ChannelSelectMenuBuilder>()
                .setComponents([channelSelectMenu])
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${currentConfig.name}`)
                .setDescription(metadata?.description || 'Selecione um canal' + (currentConfig.value ? `\nChat atual: ${currentConfig.value.toString()}` : '') )
                .setColor(`#ffffff`)
            await view.update({
                embeds: [embed],
                components: [row],
            })
            view.on('select', async (interaction: ChannelSelectMenuInteraction) => {
                await interaction.deferUpdate()
                embed.setDescription(`Canal selecionado: <#${interaction.values[0]}>`)
                await view.update({
                    embeds: [embed],
                    components: []
                })
                view.destroy()
                resolve(interaction.channels.first()?.id)
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
        return await guild.channels.fetch(JSON.parse(config)).catch(() => undefined)
    },
    parseSettingToArrayFields: (value: Exclude<TextBasedChannel, DMChannel | PartialDMChannel>) => {
        return `Nome: ${value.name}\nID: ${value.id}`
    }


} as typeFile