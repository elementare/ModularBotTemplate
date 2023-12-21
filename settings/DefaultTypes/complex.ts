import {ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Collection, EmbedBuilder} from "discord.js";
import {
    typeFile
} from "../../types";
import {InteractionView} from "../../utils/InteractionView";
import {Setting} from "../Setting";

function mapSchema(schema: ComplexSettingStructure["schema"]): Collection<string, Setting<any>> {
    const mappedSchema = new Collection<string, Setting<any>>()
    for (const key in schema) {
        const element = schema[key]
        mappedSchema.set(key, element)
    }
    return mappedSchema
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

function checkFilledSchema(currentConfig: ComplexSettingClass): boolean {
    for (const [key, value] of currentConfig.schema) {
        if (!(currentConfig.value as any)?.[key]) return false
    }
    return true
}

type ComplexSettingStructure = {
    name: string
    description: string
    permission: bigint

    schema: {
        [key: string]: Setting<any>
    }
    embed: EmbedBuilder
}

type ComplexSettingReturn = {
    [key: string]: any
}

export default class ComplexSettingClass implements Setting<ComplexSettingReturn> {
    public type = "complex"
    public name: string
    public description: string
    public permission: bigint
    public structure: ComplexSettingStructure
    public value?: ComplexSettingReturn
    public embed: EmbedBuilder
    public schema: Collection<string, ComplexSettingStructure["schema"][string]>

    constructor(setting: ComplexSettingStructure, value?: ComplexSettingReturn) {
        this.name = setting.name
        this.description = setting.description
        this.permission = setting.permission
        this.structure = setting
        this.embed = setting.embed

        this.schema = mapSchema(setting.schema)

        this.value = value
    }

    public run(view: InteractionView): Promise<ComplexSettingReturn> {
        return new Promise(async (resolve, reject) => {
            const buttons = this.schema.map((value, key) => {
                return new ButtonBuilder()
                    .setCustomId(key)
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
                embeds: [this.embed],
                components: rows
            })
            view.on('confirm', async (i: ButtonInteraction) => {
                if (!checkFilledSchema(this)) {
                    const newEmbed = new EmbedBuilder(this.embed.toJSON())
                        .setFooter({text: 'Você não preencheu todos os campos! 💔'})
                        .setColor('#ff6767')
                    return view.update({
                        embeds: [newEmbed],
                        components: rows
                    })
                }
                const embedSuccess = new EmbedBuilder()
                    .setTitle(`Configuração de ${this.name} concluída`)
                    .setColor('#ffffff')
                    .setDescription('A configuração foi alterada com sucesso!')

                await view.update({
                    embeds: [embedSuccess],
                    components: []
                })
                view.destroy()
                resolve(this.value ?? {})
            })
            view.on('any', async (i: ButtonInteraction) => {
                if (i.customId === 'confirm') return

                await i.deferUpdate()
                const key = i.customId.split('-')[0]
                console.log(key)
                const setting = this.schema.get(key)
                console.log(setting)
                if (!setting) return
                let current = this.value ?? {}
                setting.value = current[key]
                await setting.run(view.clone()).then(async (value: any) => {

                    current[key] = value
                    this.value = current

                    await view.update({
                        embeds: [this.embed],
                        components: rows
                    })
                }).catch(() => {
                })
            })
        })
    }
}