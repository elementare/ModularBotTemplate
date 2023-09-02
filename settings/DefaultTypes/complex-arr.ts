import {InteractionView} from "../../utils/InteractionView";
import {SavedSetting, SchemaComplexSetting, typeFile} from "../../types";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder} from "discord.js";

function parseSettingToArrayFields(current: any[], metadataFn: (value: any) => string) {
    const inlined = (current?.length || 0) > 5
    return current.map((value, index) => {
        return {
            name: index + 1 + '',
            value: metadataFn(value),
            inline: inlined
        }
    })
}

export default {
    name: 'complex-arr',
    run: (view: InteractionView, types: typeFile[], currentConfig: SavedSetting) => {
        return new Promise(async (resolve, reject) => {
            const baseTypeStr = currentConfig.type.split('-')[0]
            const baseType = types.find((value) => value.name === baseTypeStr)
            if (!baseType) return reject('Type not found')
            const complexType = types.find((value) => value.name === 'complex-arr') as typeFile
            const current = currentConfig.value as (any[] | undefined) ?? []
            console.log(complexType)
            const metadataFn = currentConfig.metadata || complexType.parseSettingToArrayFields
            console.log(metadataFn)
            const values = parseSettingToArrayFields(current, metadataFn)
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${currentConfig.name}`)
                .setFields(values)
                .setColor(`#ffffff`)
            const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>()
                .setComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId('select')
                        .setPlaceholder('Selecione uma opção')
                        .addOptions(values.map((value, index) => {
                            return {
                                label: value.name,
                                value: index + ''
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
                const index = parseInt(i.values[0])
                const value = current[index]
                if (!value) return
                const type = types.find((value) => value.name === baseTypeStr)
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
                        metadata: value.metadata,
                        schema: (currentConfig.struc as unknown as SchemaComplexSetting).schema,
                        embed: (currentConfig.struc as unknown as SchemaComplexSetting).embed
                    },
                    type: value.type,
                    metadata: value.metadata
                }
                const cloned = view.clone()
                const result = await type.run(cloned, types, valueProcessed).catch(() => undefined)
                cloned.destroy()
                if (!result) return
                current[index] = result
                // Updating embed
                const values = parseSettingToArrayFields(current, metadataFn)
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
                view.destroy()
                view = undefined as any // Destroying view to prevent memory leaks
                resolve(current)
            })
            view.on('add', async (i) => {
                const type = types.find((value) => value.name === baseTypeStr)
                if (!type) return
                const valueProcessed: SavedSetting = {
                    name: 'Novo valor',
                    value: undefined,
                    permission: BigInt(8),
                    struc: {
                        name: 'Novo valor',
                        description: currentConfig.struc.description,
                        type: baseTypeStr as any,
                        permission: BigInt(8),
                        metadata: metadataFn,
                        schema: (currentConfig.struc as unknown as SchemaComplexSetting).schema,
                        embed: (currentConfig.struc as unknown as SchemaComplexSetting).embed
                    },
                    type: baseTypeStr as any,
                    metadata: metadataFn,
                }
                await i.deferUpdate()
                const clonedView = view.clone()
                const result = await type.run(clonedView, types, valueProcessed).catch(() => {})
                clonedView.destroy()
                if (!result) return
                console.log(`Result:`)
                console.log(result)
                current.push(result)
                const values = parseSettingToArrayFields(current, metadataFn)
                if (current.length === 1) { // Add a menu if not exists
                    rowArr.splice(0,0, menuRow)
                     menuRow.components[0].addOptions(values.map((value, index) => {
                         console.log(value)
                        return {
                            label: value.name,
                            value: index + ''
                        }
                     }))
                }
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
                const values = parseSettingToArrayFields(current, metadataFn)
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
                const values = parseSettingToArrayFields(current, metadataFn)
                embed.setFields(values)
                if (current.length === 0) rowArr.splice(0,1) // Remove menu if not exists
                await view.update({
                    embeds: [embed],
                    components: rowArr
                })
            })
        })
    },
    parseSettingToArrayFields: (value: object): string => {
        const keys = Object.keys(value)
        const values = Object.values(value)
        return keys.map((key, index) => {
            return `${key}: ${values[index]}`
        }).join('\n')
    }
}