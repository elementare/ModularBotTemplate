import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";
import {SavedSetting, typeFile} from "../../types";
import {EmbedMenu} from "../../utils/EmbedMenu";
import {InteractionView} from "../../utils/InteractionView";

function parseSettingToArrayFields(current: any[]) {
    const inlined = (current?.length || 0) > 5
    return current.map((value, index) => {
        if (typeof value === 'object') {
            const keys = Object.keys(value)
            const values = Object.values(value)
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
            value: value,
            inline: inlined
        }
    })
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
            view.on('confirm', async (i) => {
                await view.update({
                    content: 'Alterações confirmadas!',
                    embeds: [],
                    components: []
                })
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
            view.on('remove', async (i) => {
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
                console.log(index)
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