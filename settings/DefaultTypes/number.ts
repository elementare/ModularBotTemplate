import {
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ButtonStyle,
    ButtonInteraction
} from "discord.js";
import {SavedSetting, SettingStructure, typeFile} from "../../types";
import {InteractionView} from "../../utils/InteractionView";
import {BaseSettingStructure, Setting} from "../Setting";
function generateRandomId(length: number = 8): string {
    if (length <= 0) return '';
    return Math.floor(Math.random() * 10).toString() + generateRandomId(length - 1);
}

export class NumberSettingFile implements Setting<number> {
    public type = 'number';
    public complex = false;
    public name: string;
    public description: string;
    public permission?: bigint;
    public structure: BaseSettingStructure;
    public value?: number;
    constructor(setting: BaseSettingStructure, value?: number) {
        this.name = setting.name;
        this.description = setting.description;
        this.permission = setting.permission;
        this.structure = setting;
        this.value = value;
    }

    public run(view: InteractionView): Promise<number> {
        return new Promise(async (resolve, reject) => {
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${this.name}`)
                .setFields([
                    {
                        name: 'Descrição',
                        value: `${this.description}`,
                    },
                    {
                        name: 'Valor numérico atual',
                        value: `${this.value ?? 'Não definido'}`,
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
            view.once('set', async (i: ButtonInteraction) => {
                await i.deferUpdate()
                const embed = new EmbedBuilder()
                    .setTitle(`Configurar ${this.name}`)
                    .setFields([
                        {
                            name: 'Descrição',
                            value: `${this.description}`,
                        },
                        {
                            name: 'Valor numérico atual',
                            value: `${this.value ?? 'Não definido'}`,
                        }
                    ])
                    .setColor(`#ffffff`)
                    .setFooter({text: 'Você tem 30 segundos para mandar o novo valor numérico'})
                await view.update({
                    embeds: [embed],
                    components: []
                })
                const value = await i.channel?.awaitMessages({
                    filter: m => m.author.id === view.interaction.user.id,
                    max: 1,
                    time: 30000
                }).then(collected => collected.first()?.content).catch(() => undefined)
                if (!value) {
                    const embed = new EmbedBuilder()
                        .setTitle(`Configurar ${this.name}`)
                        .setFields([
                            {
                                name: 'Descrição',
                                value: `${this.description}`,
                            },
                            {
                                name: 'Valor numérico atual',
                                value: `${this.value ?? 'Não definido'}`,
                            }
                        ])
                        .setColor(`#ffffff`)
                        .setFooter({text: 'Você não enviou um valor a tempo'})
                    await view.update({
                        embeds: [embed],
                        components: []
                    })
                    return reject('Não enviou um valor a tempo')
                }
                const number = parseInt(value ?? '')
                if (isNaN(number)) {
                    const embed = new EmbedBuilder()
                        .setTitle(`Configurar ${this.name}`)
                        .setFields([
                            {
                                name: 'Descrição',
                                value: `${this.description}`,
                            },
                            {
                                name: 'Valor numérico atual',
                                value: `${this.value ?? 'Não definido'}`,
                            }
                        ])
                        .setColor(`#ffffff`)
                        .setFooter({text: 'Você não enviou um valor numérico'})
                    await view.update({
                        embeds: [embed],
                        components: []
                    })
                    return reject('Não é um número')
                }
                const embed2 = new EmbedBuilder()
                    .setTitle(`Configurar ${this.name}`)
                    .setFields([
                        {
                            name: 'Descrição',
                            value: `${this.description}`,
                            inline: false
                        },
                        {
                            name: 'Valor anterior',
                            value: `${this.value ?? 'Não definido'}`,
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
                view.destroy()
                resolve(number)
            })
        })
    }

}

export default {
    name: 'number',
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
                        name: 'Valor numérico atual',
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
            view.once('set', async (i: ButtonInteraction) => {
                await i.deferUpdate()
                const embed = new EmbedBuilder()
                    .setTitle(`Configurar ${currentConfig.name}`)
                    .setFields([
                        {
                            name: 'Descrição',
                            value: `${currentConfig.struc.description}`,
                        },
                        {
                            name: 'Valor numérico atual',
                            value: `${currentConfig?.value ?? 'Não definido'}`,
                        }
                    ])
                    .setColor(`#ffffff`)
                    .setFooter({text: 'Você tem 30 segundos para mandar o novo valor numérico'})
                await view.update({
                    embeds: [embed],
                    components: []
                })
                const value = await i.channel?.awaitMessages({
                    filter: m => m.author.id === view.interaction.user.id,
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
                                name: 'Valor numérico atual',
                                value: `${currentConfig?.value ?? 'Não definido'}`,
                            }
                        ])
                        .setColor(`#ffffff`)
                        .setFooter({text: 'Você não enviou um valor a tempo'})
                    await view.update({
                        embeds: [embed],
                        components: []
                    })
                    return reject('Não enviou um valor a tempo')
                }
                const number = parseInt(value ?? '')
                if (isNaN(number)) {
                    const embed = new EmbedBuilder()
                        .setTitle(`Configurar ${currentConfig.name}`)
                        .setFields([
                            {
                                name: 'Descrição',
                                value: `${currentConfig.struc.description}`,
                            },
                            {
                                name: 'Valor numérico atual',
                                value: `${currentConfig?.value ?? 'Não definido'}`,
                            }
                        ])
                        .setColor(`#ffffff`)
                        .setFooter({text: 'Você não enviou um valor numérico'})
                    await view.update({
                        embeds: [embed],
                        components: []
                    })
                    return reject('Não é um número')
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
                view.destroy()
                view = undefined as any // Destroying view to prevent memory leaks
                resolve(number)
            })
        })
    }
}