import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    resolveColor
} from "discord.js";
import {ComplexSetting, DbSetting, SavedSetting, SchemaSetting, typeFile} from "../types";
import {EmbedMenu} from "../classes/structs/EmbedMenu";

function mapSchema(schema: ComplexSetting["schema"]): Map<string, SchemaSetting> {
    const mappedSchema: any = new Map()
    for (const key in schema) {
        const element = schema[key]
        mappedSchema.set(key, element)
    }
    return mappedSchema
}

export default {
    name: 'complex',
    run: (interaction: ChatInputCommandInteraction, types: typeFile[], currentConfig: SavedSetting) => {
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
            const row = new ActionRowBuilder<ButtonBuilder>()
                .setComponents(buttons)
            const msg = await interaction.reply({
                embeds: [embed],
                components: [row],
                fetchReply: true
            })
            const menu = new EmbedMenu(embed, row, msg, interaction.user.id)
            menu.on('any', (i: ButtonInteraction) => {
                menu.stop()
                const setting = mappedSchema.get(i.customId)
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
                console.log(currentSetting)
                if (setting.type === 'complex') {
                    // TODO
                } else {
                    type.run(i as any, types, currentSetting).then((value: any) => {
                        const values = currentConfig.value ?? {}
                        values[setting.name] = value
                        return resolve(values)
                    }).catch(() => {})
                }

            })
        })
    }
}