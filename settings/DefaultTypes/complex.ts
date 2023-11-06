import {ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, resolveColor} from "discord.js";
import {
    ComplexSetting,
    CustomSetting,
    ExtendedClient,
    SavedSetting,
    SchemaComplexSetting,
    SchemaSetting,
    typeFile
} from "../../types";
import {InteractionView} from "../../utils/InteractionView";
import {Setting} from "../../classes/structs/Setting";
import Guild from "../../classes/structs/Guild";

function mapSchema(schema: ComplexSetting["schema"]): Map<string, SchemaSetting> {
    const mappedSchema: any = new Map()
    for (const key in schema) {
        const element = schema[key]
        mappedSchema.set(key, element)
    }
    return mappedSchema
}

function checkComplex(setting: ComplexSetting | CustomSetting): setting is ComplexSetting {
    return setting.type === "complex" || setting.type === "complex-arr"
}

function chunkArr<T>(arr: T[], size: number): T[][] {
    const chunkedArr: T[][] = [];
    let index = 0;
    while (index < arr.length) {
        chunkedArr.push(arr.slice(index, size + index));
        index += size;
    }
    return chunkedArr;
}

function checkFilledSchema(currentConfig: SavedSetting): boolean {
    const structure = currentConfig.struc as ComplexSetting
    const mappedSchema = mapSchema(structure.schema)
    for (const [key, value] of mappedSchema) {
        if (!currentConfig.value?.[key]) return false // Copilot is a genius, value.required &&
    }
    return true
}

export default class ComplexSettingClass extends Setting {
    public settingType: string = "complex"
    constructor(name: string, value: any | null, permission: bigint, description: string,guild: Guild) {
        super({
            name,
            value,
            permission,
            description,
            guild
        });
    }

    public run(view: InteractionView, types: typeFile[], currentConfig: SavedSetting) {
        return new Promise(async (resolve, reject) => {
            const structure = currentConfig.struc as ComplexSetting
            if (structure.embed.color) structure.embed.color = resolveColor(structure.embed.color)
            const embed = new EmbedBuilder(structure.embed)
            const mappedSchema = mapSchema(structure.schema)
            const buttons = Array.from(mappedSchema.values()).map((value) => {
                return new ButtonBuilder()
                    .setCustomId(value.name)
                    .setLabel(value.name)
                    .setStyle(ButtonStyle.Primary)
            })
            const splitButtons = chunkArr(buttons, 5)
            const rows = splitButtons.map((value) => {
                return new ActionRowBuilder<ButtonBuilder>().setComponents(value)
            })
            if (rows.length > 4) return reject('Max 4 rows')
            rows.push(new ActionRowBuilder<ButtonBuilder>().setComponents([
                new ButtonBuilder()
                    .setCustomId('confirm')
                    .setLabel('Confirmar alterações')
                    .setStyle(ButtonStyle.Success)
            ]))
            await view.update({
                embeds: [embed],
                components: rows
            })
            view.on('confirm', async (i: ButtonInteraction) => {
                if (!checkFilledSchema(currentConfig)) {
                    const newEmbed = new EmbedBuilder(embed.toJSON())
                        .setFooter({text: 'Você não preencheu todos os campos! 💔'})
                        .setColor('#ff6767')
                    // await i.deferUpdate()
                    return view.update({
                        embeds: [newEmbed],
                        components: rows
                    })
                }
// await i.deferUpdate()
                const embedSuccess = new EmbedBuilder()
                    .setTitle(`Configuração de ${currentConfig.name} concluída`)
                    .setColor('#ffffff')
                    .setDescription('A configuração foi alterada com sucesso!')

                await view.update({
                    embeds: [embedSuccess],
                    components: []
                })
                view.destroy()
                resolve(currentConfig.value)
            })
            view.on('any', async (i: ButtonInteraction) => {
                if (i.customId === 'confirm') return
                await i.deferUpdate()
                const setting = mappedSchema.get(i.customId.split('-')[0])
                if (!setting) return
                const type = types.find((value) => value.name === setting.type)
                if (!type) return
                let current = currentConfig.value
                const currentSetting: SavedSetting = {
                    name: setting.name,
                    value: current?.[setting.name] ?? undefined,
                    struc: {
                        name: setting.name,
                        description: setting.description,
                        permission: BigInt(8),
                        type: setting.type as any
                    },
                    permission: BigInt(8),
                    type: setting.type as any
                }
                if (checkComplex(currentSetting.struc)) {
                    const settingg = setting as SchemaComplexSetting
                    currentSetting.struc.schema = settingg.schema
                    currentSetting.struc.embed = settingg.embed
                }
                await type.run(view.clone(), types, currentSetting, (setting as any).metadata).then(async (value: any) => {
                    const values = currentConfig.value ?? {}
                    values[setting.name] = value
                    currentConfig.value = values
                    await view.update({
                        embeds: [embed],
                        components: rows
                    })
                }).catch(() => {
                })

            })
        })
    }
}