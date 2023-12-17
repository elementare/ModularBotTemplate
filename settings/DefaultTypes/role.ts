import {ActionRowBuilder, EmbedBuilder, Role, RoleSelectMenuBuilder, RoleSelectMenuInteraction} from "discord.js";
import {SavedSetting, SettingStructure, typeFile} from "../../types";
import {InteractionView} from "../../utils/InteractionView";
import {Setting} from "../Setting";

type RoleSettingStructure = {
    name: string;
    description: string;
    type: 'role';
    complex?: boolean;
    permission?: bigint;
    max?: number;
    min?: number;
    placeholder?: string;
    embedDescription?: string;
}

export class RoleSettingFile implements Setting<Role> {
    public type = 'role';
    public complex = true;
    public name: string;
    public description: string;
    public permission?: bigint;
    public structure: RoleSettingStructure;
    public value?: Role;
    public readonly max?: number;
    public readonly min?: number;
    public readonly placeholder?: string;
    public readonly descriptionMetadata?: string;


    constructor(setting: RoleSettingStructure, value?: Role) {
        this.name = setting.name;
        this.description = setting.description;
        this.permission = setting.permission;
        this.structure = setting;
        this.max = setting.max;
        this.min = setting.min;
        this.placeholder = setting.placeholder;
        this.descriptionMetadata = setting.embedDescription;



        this.value = value;
    }

    run(view: InteractionView): Promise<Role> {
        return new Promise(async (resolve, reject) => {
            const roleSelectMenu = new RoleSelectMenuBuilder()
                .setMaxValues(this.max || 1)
                .setMinValues(this.min || 1)
                .setPlaceholder(this.placeholder || 'Selecione um canal')
                .setCustomId('select')
            const row = new ActionRowBuilder<RoleSelectMenuBuilder>()
                .setComponents([roleSelectMenu])
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${this.name}`)
                .setDescription(this.description || 'Selecione um cargo')
                .setColor(`#ffffff`)
            await view.update({
                embeds: [embed],
                components: [row],
            })
            view.on('select', async (interaction: RoleSelectMenuInteraction) => {
                await interaction.deferUpdate()
                embed.setDescription(`Cargo selecionado: <@&${interaction.values[0]}>`)
                await view.update({
                    embeds: [embed],
                    components: []
                })
                resolve(interaction.roles.first() as Role)
            })
            view.once('end', (reason) => {
                if (reason !== 'time') return
                view.update({
                    embeds: [],
                    components: [],
                    content: 'Tempo esgotado'
                })
                reject()
            })
        })
    }

    parse(config: string) {
        return JSON.parse(config)
    }
    parseToField(value: Role) {
        return `Nome: ${value.name}\nMenção: <@&${value.id}>`
    }

}

export default {
    name: 'role',
    complex: true,
    run: (view: InteractionView, types: typeFile[], currentConfig: SavedSetting, metadata) => {
        return new Promise(async (resolve, reject) => {
            const roleSelectMenu = new RoleSelectMenuBuilder()
                .setMaxValues(metadata?.max || 1)
                .setMinValues(metadata?.min || 1)
                .setPlaceholder(metadata?.placeholder || 'Selecione um canal')
                .setCustomId('select')
            const row = new ActionRowBuilder<RoleSelectMenuBuilder>()
                .setComponents([roleSelectMenu])
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${currentConfig.name}`)
                .setDescription(metadata?.description || 'Selecione um cargo')
                .setColor(`#ffffff`)
            await view.update({
                embeds: [embed],
                components: [row],
            })
            view.on('select', async (interaction: RoleSelectMenuInteraction) => {
                await interaction.deferUpdate()
                embed.setDescription(`Cargo selecionado: <@&${interaction.values[0]}>`)
                await view.update({
                    embeds: [embed],
                    components: []
                })
                resolve(interaction.roles.first()?.id)
            })
            view.once('end', (reason) => {
                if (reason !== 'time') return
                view.update({
                    embeds: [],
                    components: [],
                    content: 'Tempo esgotado'
                })
                reject()
            })
        })
    },
    parse: async (config, client, guildData, guild) => {
        return await guild.roles.fetch(JSON.parse(config)).catch(() => undefined)
    },
    parseSettingToArrayFields: (value: Role) => {
        return `Nome: ${value.name}\nMenção: <@&${value.id}>`
    }
} as typeFile