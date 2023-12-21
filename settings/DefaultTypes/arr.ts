import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";
import {SavedSetting, typeFile} from "../../types";
import {InteractionView} from "../../utils/InteractionView";
import {Setting} from "../Setting";

function parseSettingToArrayFields(current: Return[], parseFunction?: (value: Return) => string) {
    const inlined = (current?.length || 0) > 5
    return current.map((value, index) => {
        if (parseFunction) return {
            name: index + 1 + '',
            value: parseFunction(value),
            inline: inlined
        }
        if (typeof value === 'object') {

            const keys = Object.keys(value as object)
            const values = Object.values(value as object)
            return {
                name: index + 1 + '',
                value: values.map((value, index) => {
                    return `${keys[index]}: ${value}`
                }).join('\n'),
                inline: inlined
            }
        }
        return {
            name: index + 1 + '',
            value: value + '',
            inline: inlined
        }
    })
}

type ArraySettingStructure = {
    name: string;
    description: string;
    permission?: bigint;

    child: Setting<any>;
    overrides?: {
        parseToField?: (value: Return) => string;
    }
}

type Return = Setting<unknown>["value"]


export class ArrSettingFile implements Setting<Setting<unknown>["value"][]> {
    public type = 'arr';
    public complex = true;
    public name: string;
    public description: string;
    public permission?: bigint;
    public structure: any;
    public value?: Return[];
    public child: Setting<any>;
    public overrides?: {
        parseToField?: (value: Return) => string;
    }
    constructor(setting: ArraySettingStructure, value?: unknown[]) {
        this.name = setting.name;
        this.description = setting.description;
        this.permission = setting.permission;
        this.structure = setting;

        this.child = setting.child;
        this.overrides = setting.overrides

        this.value = value;
    }

    public run(view: InteractionView): Promise<Return[]> {
        return new Promise(async (resolve) => {
            const current = this.value ?? []

            const values = parseSettingToArrayFields(current, this.overrides?.parseToField ?? this.child.parseToField)
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${this.name}`)
                .setFields(values)
                .setColor(`#ffffff`)
            const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>()
                .setComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId('select')
                        .setPlaceholder('Selecione uma opção')
                        .addOptions(current.map((value, index) => {
                            return {
                                label: index + 1 + '',
                                value: value + ''
                            }
                        }))
                ])
            const controlRow = new ActionRowBuilder<ButtonBuilder>()
                .setComponents([
                    new ButtonBuilder()
                        .setCustomId('add')
                        .setLabel('Adicionar')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('remove')
                        .setLabel('Remover')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('confirm')
                        .setLabel('Confirmar alterações')
                        .setStyle(ButtonStyle.Success)
                ])
            const rowArr: any[] = []
            if (values.length > 0) rowArr.push(menuRow)
            rowArr.push(controlRow)
            await view.update({
                embeds: [embed],
                components: rowArr
            })
            view.on('select', async (i) => {
                const index = current.findIndex((setting) => setting === i.values[0])
                const value = current[index]
                if (!value) return
                await i.deferUpdate()

                const cloned = view.clone()
                const result = await this.child.run(cloned).catch(() => undefined)
                cloned.destroy()
                if (!result) return
                current[index] = result
                // Updating embed
                const values = parseSettingToArrayFields(current, this.overrides?.parseToField ?? this.child.parseToField)
                embed.setFields(values)
                await view.update({
                    embeds: [embed],
                    components: rowArr
                })
            })
            view.on('confirm', async (_) => {
                await view.update({
                    content: 'Alterações confirmadas!',
                    embeds: [],
                    components: []
                })
                view.destroy()
                view = undefined as any // Destroying view to prevent memory leaks
                resolve(current)
            })
            view.on('add', async (_) => {
                const clonedView = view.clone()
                await i.deferUpdate()
                const oldName = this.child.name
                this.child.name = 'Novo valor'
                const result = await this.child.run(clonedView).catch(() => { })
                this.child.name = oldName
                clonedView.destroy()
                if (!result) return
                current.push(result)
                const a = current.map((value, index) => {
                    return {
                        label: index + 1 + '',
                        value: value + ''
                    }
                })
                menuRow.setComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId('select')
                        .setPlaceholder('Selecione uma opção')
                        .addOptions(a)
                ])
                if (current.length === 1) rowArr.splice(0,0, menuRow) // Add a menu if not exists
                const values = parseSettingToArrayFields(current, this.overrides?.parseToField ?? this.child.parseToField)
                embed.setFields(values)
                this.value = current
                await view.update({
                    embeds: [embed],
                    components: rowArr
                })
            })

            /*
                Remove events
             */
            view.on('remove', async (_) => {
                const removeEmbed = new EmbedBuilder()
                    .setTitle('Remover valor')
                    .setDescription('Selecione o valor que deseja remover')
                    .setColor('#ffffff')
                const components = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .setComponents([
                        new StringSelectMenuBuilder()
                            .setCustomId('removeSelect')
                            .setPlaceholder('Selecione uma opção')
                            .setMaxValues(1)
                            .addOptions(values.map((value) => {
                                    return {
                                        label: value.name,
                                        value: value.value
                                    }
                                })
                            )
                    ])
                await view.update({
                    embeds: [removeEmbed],
                    components: [components]
                })
            })
            view.on('removeSelect', async (i) => {
                const index = current.findIndex((value) => value === i.values[0])
                if (index === -1) return
                await i.deferUpdate()
                current.splice(index, 1)
                const values = parseSettingToArrayFields(current, this.overrides?.parseToField ?? this.child.parseToField)
                embed.setFields(values)
                if (current.length === 0) rowArr.splice(0,1) // Remove menu if not exists
                await view.update({
                    embeds: [embed],
                    components: rowArr
                })
            })
        })
    }
}


export default {
    name: 'arr',
    run: (view: InteractionView, types: typeFile[], currentConfig: SavedSetting) => {
        return new Promise(async (resolve, reject) => {
            const baseType = currentConfig.type.split('-')[0]
            const type = types.find((value) => value.name === baseType)
            if (!type) return reject('Type not found')
            const current = currentConfig.value as (any[] | undefined) ?? []
            const values = parseSettingToArrayFields(current)
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${currentConfig.name}`)
                .setFields(values)
                .setColor(`#ffffff`)
            const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>()
                .setComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId('select')
                        .setPlaceholder('Selecione uma opção')
                        .addOptions(values.map((value) => {
                            return {
                                label: value.name,
                                value: value.value
                            }
                        }))
                ])
            const controlRow = new ActionRowBuilder<ButtonBuilder>()
                .setComponents([
                    new ButtonBuilder()
                        .setCustomId('add')
                        .setLabel('Adicionar')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('remove')
                        .setLabel('Remover')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('confirm')
                        .setLabel('Confirmar alterações')
                        .setStyle(ButtonStyle.Success)
                ])
            const rowArr: any[] = []
            if (values.length > 0) rowArr.push(menuRow)
            rowArr.push(controlRow)
            await view.update({
                embeds: [embed],
                components: rowArr
            })
            view.on('select', async (i) => {
                const index = current.findIndex((value) => value === i.values[0])
                const value = current[index]
                if (!value) return
                const type = types.find((value) => value.name === baseType)
                if (!type) return
                await i.deferUpdate()
                const valueProcessed: SavedSetting = {
                    name: index + 1 + '',
                    value: value,
                    permission: BigInt(8),
                    struc: {
                        name: value.name,
                        description: currentConfig.struc.description,
                        type: value.type,
                        permission: BigInt(8),
                    },
                    type: value.type
                }
                const cloned = view.clone()
                const result = await type.run(cloned, types, valueProcessed).catch(() => undefined)
                cloned.destroy()
                if (!result) return
                (current as any[])[index] = result
                // Updating embed
                const values = parseSettingToArrayFields(current)
                embed.setFields(values)
                await view.update({
                    embeds: [embed],
                    components: rowArr
                })
            })
            view.on('confirm', async (_) => {
                await view.update({
                    content: 'Alterações confirmadas!',
                    embeds: [],
                    components: []
                })
                view.destroy()
                view = undefined as any // Destroying view to prevent memory leaks
                resolve(current)
            })
            view.on('add', async (i) => {
                const type = types.find((value) => value.name === baseType)
                if (!type) return
                const valueProcessed: SavedSetting = {
                    name: 'Novo valor',
                    value: undefined,
                    permission: BigInt(8),
                    struc: {
                        name: 'Novo valor',
                        description: currentConfig.struc.description,
                        type: baseType as any,
                        permission: BigInt(8),
                    },
                    type: baseType as any
                }
                await i.deferUpdate()
                const clonedView = view.clone()
                const result = await type.run(clonedView, types, valueProcessed).catch(() => {})
                clonedView.destroy()
                if (!result) return
                current.push(result)
                if (current.length === 1) rowArr.splice(0,0, menuRow) // Add a menu if not exists
                const values = parseSettingToArrayFields(current)
                embed.setFields(values)
                currentConfig.value = current
                await view.update({
                    embeds: [embed],
                    components: rowArr
                })
            })

            /*
                Remove events
             */
            view.on('remove', async (_) => {
                const removeEmbed = new EmbedBuilder()
                    .setTitle('Remover valor')
                    .setDescription('Selecione o valor que deseja remover')
                    .setColor('#ffffff')
                const components = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .setComponents([
                        new StringSelectMenuBuilder()
                            .setCustomId('removeSelect')
                            .setPlaceholder('Selecione uma opção')
                            .setMaxValues(1)
                            .addOptions(values.map((value) => {
                                return {
                                    label: value.name,
                                    value: value.value
                                }
                            })
                        )
                    ])
                await view.update({
                    embeds: [removeEmbed],
                    components: [components]
                })
            })
            view.on('removeSelect', async (i) => {
                const index = current.findIndex((value) => value === i.values[0])
                if (index === -1) return
                await i.deferUpdate()
                current.splice(index, 1)
                const values = parseSettingToArrayFields(current)
                embed.setFields(values)
                if (current.length === 0) rowArr.splice(0,1) // Remove menu if not exists
                await view.update({
                    embeds: [embed],
                    components: rowArr
                })
            })
        })
    }
}