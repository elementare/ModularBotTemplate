import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder
} from "discord.js";
import { SavedSetting, typeFile} from "../../types";
import {InteractionView} from "../../utils/InteractionView";
import {BaseSettingStructure, Setting} from "../Setting";



export class BooleanSettingFile implements Setting<boolean> {
    public type = 'boolean';
    public complex = false;
    public name: string;
    public description: string;
    public permission?: bigint;
    public structure: BaseSettingStructure;
    public value?: boolean;
    constructor(setting: BaseSettingStructure, value?: boolean) {
        this.name = setting.name;
        this.description = setting.description;
        this.permission = setting.permission;
        this.structure = setting;
        this.value = value;
    }

    public run(view: InteractionView): Promise<boolean> {
        return new Promise(async (resolve) => {
            const value = !!(this.value)
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${this.name}`)
                .setFields([
                    {
                        name: 'Descrição',
                        value: `${this.description}`,
                    },
                    {
                        name: 'Valor atual',
                        value: `${value ? 'Ativado' : 'Desativado'}`,
                    }
                ])
                .setColor(`#ffffff`)
            const buttons = new ActionRowBuilder<ButtonBuilder>()
                .setComponents([
                    new ButtonBuilder()
                        .setCustomId('activate')
                        .setLabel('Ativar')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(value),
                    new ButtonBuilder()
                        .setCustomId('deactivate')
                        .setLabel('Desativar')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!value)
                ])
            await view.update({
                embeds: [embed],
                components: [buttons]
            })
            view.on('any', async (i: ButtonInteraction) => {
                await i.deferUpdate()
                const newValue = !value
                const embed = new EmbedBuilder()
                    .setTitle(`Configurar ${this.name}`)
                    .setFields([
                        {
                            name: 'Descrição',
                            value: `${this.description}`,
                        },
                        {
                            name: 'Valor atual',
                            value: `${newValue ? 'Ativado' : 'Desativado'}`,
                        }
                    ])
                    .setColor(`#ffffff`)
                await view.update({
                    embeds: [embed],
                    components: []
                })
                view.destroy()
                resolve(newValue)
            })
        })
    }
}





export default {
    name: 'boolean',
    complex: false,
    run: (view: InteractionView, types: typeFile[], currentConfig: SavedSetting) => {
        return new Promise(async (resolve) => {
            const value = !!(currentConfig?.value)
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${currentConfig.name}`)
                .setFields([
                    {
                        name: 'Descrição',
                        value: `${currentConfig.struc.description}`,
                    },
                    {
                        name: 'Valor atual',
                        value: `${value ? 'Ativado' : 'Desativado'}`,
                    }
                ])
                .setColor(`#ffffff`)
            const buttons = new ActionRowBuilder<ButtonBuilder>()
                .setComponents([
                    new ButtonBuilder()
                        .setCustomId('activate')
                        .setLabel('Ativar')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(value),
                    new ButtonBuilder()
                        .setCustomId('deactivate')
                        .setLabel('Desativar')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!value)
                ])
            await view.update({
                embeds: [embed],
                components: [buttons]
            })
            view.on('any', async (i: ButtonInteraction) => {
                await i.deferUpdate()
                const newValue = !value
                const embed = new EmbedBuilder()
                    .setTitle(`Configurar ${currentConfig.name}`)
                    .setFields([
                        {
                            name: 'Descrição',
                            value: `${currentConfig.struc.description}`,
                        },
                        {
                            name: 'Valor atual',
                            value: `${newValue ? 'Ativado' : 'Desativado'}`,
                        }
                    ])
                    .setColor(`#ffffff`)
                await view.update({
                    embeds: [embed],
                    components: []
                })
                view.destroy()
                view = undefined as any // Destroying view to prevent memory leaks
                resolve(newValue)
            })
        })
    }
}