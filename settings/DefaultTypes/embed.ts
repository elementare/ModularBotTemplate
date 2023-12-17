import {APIEmbed, EmbedBuilder} from "discord.js";
import {SavedSetting, typeFile} from "../../types";
import {InteractionView} from "../../utils/InteractionView";
import {EmbedCreator} from "../../utils/EmbedCreatorComponent";
import {BaseSettingStructure, Setting} from "../Setting";


export class EmbedSettingFile implements Setting<EmbedBuilder> {
    public type = 'embed';
    public complex = true;
    public name: string;
    public description: string;
    public permission?: bigint;
    public structure: BaseSettingStructure;
    public value?: EmbedBuilder;
    constructor(setting: BaseSettingStructure, value?: EmbedBuilder) {
        this.name = setting.name;
        this.description = setting.description;
        this.permission = setting.permission;
        this.structure = setting;
        this.value = value;
    }

    public run(view: InteractionView): Promise<EmbedBuilder> {
        return new Promise(async (resolve, reject) => {
            const embed = await EmbedCreator(view, (m) => view.Interaction.user.id === m.author.id, {
                shouldComplete: true,
                data: this.value?.data || undefined
            }).catch(() => {})
            if (!embed) return reject()
            else resolve(embed)
        })
    }
    public parse(config: string) {
        return new EmbedBuilder(JSON.parse(config))
    }
    public parseToField(value: EmbedBuilder) {
        return `Título: ${value.data.title}\nDescrição: ${value.data.description?.length as any > 55 ? value.data.description?.slice(0, 55) + "...":value.data.description || "Sem descricão"}`
    }

}



export default {
    name: 'embed',
    complex: true,
    run: (view: InteractionView, types: typeFile[], currentConfig: SavedSetting) => {
        return new Promise(async (resolve, reject) => {
            const embed = await EmbedCreator(view, (m) => view.Interaction.user.id === m.author.id, {
                shouldComplete: true,
                data: currentConfig?.value || null
            }).catch(() => {})
            if (!embed) return reject()
            else resolve(embed.toJSON())
        })
    },
    parse: (config, client, guildData, guild) => {
        return new EmbedBuilder(JSON.parse(config))
    },
    parseSettingToArrayFields: (value: EmbedBuilder) => {
        return `Título: ${value.data.title}\nDescrição: ${value.data.description?.length as any > 55 ? value.data.description?.slice(0, 55) + "...":value.data.description || "Sem descricão"}`
    }

} as typeFile