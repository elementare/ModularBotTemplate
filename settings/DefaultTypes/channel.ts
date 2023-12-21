import {
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    ChannelSelectMenuInteraction,
    ChannelType,
    DMChannel,
    EmbedBuilder, Guild, GuildBasedChannel,
    PartialDMChannel,
    TextBasedChannel
} from "discord.js";
import {ExtendedClient, SavedSetting, typeFile} from "../../types";
import {InteractionView} from "../../utils/InteractionView";
import {Setting} from "../Setting";

type ChannelSettingStructure = {
    name: string;
    description: string;
    permission?: bigint;
    max?: number;
    min?: number;
    placeholder?: string;
    embedDescription?: string;
    channelTypes?: ChannelType[];
}

export class ChannelSettingFile implements Setting<GuildBasedChannel> {
    public type = 'channel';
    public complex = true;
    public name: string;
    public description: string;
    public permission?: bigint;
    public structure: ChannelSettingStructure;
    public value?: GuildBasedChannel;
    public readonly max?: number;
    public readonly min?: number;
    public readonly placeholder?: string;
    public readonly descriptionMetadata?: string;
    public readonly channelTypes?: ChannelType[];
    constructor(setting: ChannelSettingStructure, value?: GuildBasedChannel) {
        this.name = setting.name;
        this.description = setting.description;
        this.permission = setting.permission;
        this.structure = setting;
        this.max = setting.max;
        this.min = setting.min;
        this.placeholder = setting.placeholder;
        this.descriptionMetadata = setting.embedDescription;
        this.channelTypes = setting.channelTypes;


        this.value = value;
    }
    public run(view: InteractionView): Promise<GuildBasedChannel> {
        return new Promise(async (resolve, reject) => {
            const channelSelectMenu = new ChannelSelectMenuBuilder()
                .setMaxValues(this.max || 1)
                .setMinValues(this.min || 1)
                .setPlaceholder(this.placeholder || 'Selecione um canal')
                .setCustomId('select')
                .setChannelTypes(ChannelType.GuildText ?? this.channelTypes)
            const row = new ActionRowBuilder<ChannelSelectMenuBuilder>()
                .setComponents([channelSelectMenu])
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${this.name}`)
                .setDescription(this.descriptionMetadata || 'Selecione um canal' + (this.value ? `\nChat atual: ${this.value.toString()}` : '') )
                .setColor(`#ffffff`)
            await view.update({
                embeds: [embed],
                components: [row],
            })
            view.on('select', async (interaction: ChannelSelectMenuInteraction) => {
                await interaction.deferUpdate()
                embed.setDescription(`Canal selecionado: <#${interaction.values[0]}>`)
                await view.update({
                    embeds: [embed],
                    components: []
                })
                view.destroy()
                resolve(interaction.channels.first() as GuildBasedChannel)
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
    public parse(config: string, client: ExtendedClient, guildData: any, guild: Guild): Promise<GuildBasedChannel> {
        return new Promise(async (resolve, reject) => {
            await guild.channels.fetch(JSON.parse(config)).then(channel => {
                resolve(channel as GuildBasedChannel)
            }).catch(() => reject)
        })
    }
    public parseToField(value: Exclude<GuildBasedChannel, DMChannel | PartialDMChannel>) {
        return `Nome: ${value.name}\nID: ${value.id}`
    }
}


export default {
    name: 'channel',
    complex: true,
    run: (view: InteractionView, types: typeFile[], currentConfig: SavedSetting, metadata) => {
        return new Promise(async (resolve, reject) => {
            const channelSelectMenu = new ChannelSelectMenuBuilder()
                .setMaxValues(metadata?.max || 1)
                .setMinValues(metadata?.min || 1)
                .setPlaceholder(metadata?.placeholder || 'Selecione um canal')
                .setCustomId('select')
                .setChannelTypes(ChannelType.GuildText ?? metadata?.channelTypes)
            const row = new ActionRowBuilder<ChannelSelectMenuBuilder>()
                .setComponents([channelSelectMenu])
            const embed = new EmbedBuilder()
                .setTitle(`Configurar ${currentConfig.name}`)
                .setDescription(metadata?.description || 'Selecione um canal' + (currentConfig.value ? `\nChat atual: ${currentConfig.value.toString()}` : '') )
                .setColor(`#ffffff`)
            await view.update({
                embeds: [embed],
                components: [row],
            })
            view.on('select', async (interaction: ChannelSelectMenuInteraction) => {
                await interaction.deferUpdate()
                embed.setDescription(`Canal selecionado: <#${interaction.values[0]}>`)
                await view.update({
                    embeds: [embed],
                    components: []
                })
                view.destroy()
                resolve(interaction.channels.first()?.id)
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
        return await guild.channels.fetch(JSON.parse(config)).catch(() => undefined)
    },
    parseSettingToArrayFields: (value: Exclude<TextBasedChannel, DMChannel | PartialDMChannel>) => {
        return `Nome: ${value.name}\nID: ${value.id}`
    }


} as typeFile