import {
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ButtonStyle,
    ButtonInteraction
} from "discord.js";
import {SavedSetting, SettingStructure} from "../types";
import {EmbedMenu} from "../classes/structs/EmbedMenu";


export default {
    name: 'string',
    run: (interaction: ChatInputCommandInteraction, currentConfig: SavedSetting) => {
        return new Promise(async (resolve, reject) => {
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${currentConfig.name}`)
                .setFields([
                    {
                        name: 'Descrição',
                        value: `${currentConfig.struc.description}`,
                    },
                    {
                        name: 'Valor atual',
                        value: `${currentConfig?.value ?? 'Não definido'}`,
                    }
                ])
                .setColor(`#ffffff`)
            const buttons = new ActionRowBuilder<ButtonBuilder>()
                .setComponents([
                    new ButtonBuilder()
                        .setCustomId('set')
                        .setLabel('Definir')
                        .setStyle(ButtonStyle.Primary)
                ])
            const message = await interaction.reply({
                embeds: [embed],
                components: [buttons],
                fetchReply: true
            })
            const menu = new EmbedMenu(embed, buttons, message, interaction.user.id)
            menu.on('set', async (i: ButtonInteraction) => {
                const embed = new EmbedBuilder()
                    .setTitle(`Configurar ${currentConfig.name}`)
                    .setFields([
                        {
                            name: 'Descrição',
                            value: `${currentConfig.struc.description}`,
                        },
                        {
                            name: 'Valor atual',
                            value: `${currentConfig?.value ?? 'Não definido'}`,
                        }
                    ])
                    .setColor(`#ffffff`)
                    .setFooter({text: 'Você tem 30 segundos para mandar o novo valor'})
                const empty = new ActionRowBuilder<ButtonBuilder>()
                await menu.updatePage(embed, empty)
                const value = await i.channel?.awaitMessages({
                    filter: m => m.author.id === interaction.user.id,
                    max: 1,
                    time: 30000
                }).then(collected => collected.first()?.content).catch(() => undefined)
                if (!value) {
                    const embed = new EmbedBuilder()
                        .setTitle(`Configurar ${currentConfig.name}`)
                        .setFields([
                            {
                                name: 'Descrição',
                                value: `${currentConfig.struc.description}`,
                            },
                            {
                                name: 'Valor atual',
                                value: `${currentConfig?.value ?? 'Não definido'}`,
                            }
                        ])
                        .setColor(`#ffffff`)
                        .setFooter({text: 'Você não enviou um valor a tempo'})
                    await menu.updatePage(embed, empty)
                }
                const embed2 = new EmbedBuilder()
                    .setTitle(`Configurar ${currentConfig.name}`)
                    .setFields([
                        {
                            name: 'Descrição',
                            value: `${currentConfig.struc.description}`,
                            inline: false
                        },
                        {
                            name: 'Valor anterior',
                            value: `${currentConfig?.value ?? 'Não definido'}`,
                            inline: true
                        },
                        {
                            name: 'Novo valor',
                            value: `${value ?? 'Não definido'}`,
                            inline: true
                        }
                    ])
                    .setColor(`#ffffff`)
                await menu.updatePage(embed2, empty)
                resolve(value)
            })
        })
    }
}