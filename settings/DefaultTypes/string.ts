import {
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ButtonStyle,
    ButtonInteraction
} from "discord.js";
import {SavedSetting, SettingStructure, typeFile} from "../../types";
import {EmbedMenu} from "../../utils/EmbedMenu";
import {InteractionView} from "../../utils/InteractionView";


export default {
    name: 'string',
    complex: false,
    run: (view: InteractionView, types: typeFile[], currentConfig: SavedSetting) => {
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
            await view.update({
                embeds: [embed],
                components: [buttons]
            })
            view.on('set', async (i: ButtonInteraction) => {
                //await i.deferUpdate()
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
                await view.update({
                    embeds: [embed],
                    components: []
                })
                const value = await i.channel?.awaitMessages({
                    filter: m => m.author.id === view.interaction.user.id,
                    max: 1,
                    time: 30000
                }).then(async collected => {
                    const msg = collected.first()
                    if (!msg) return undefined
                    await msg.delete()
                    return msg.content
                }).catch(() => undefined)
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
                    await view.update({
                        embeds: [embed],
                        components: []
                    })
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
                await view.update({
                    embeds: [embed2],
                    components: []
                })
                resolve(value)
            })
        })
    }
}