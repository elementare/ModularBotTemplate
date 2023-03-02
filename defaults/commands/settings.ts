import SlashCommand from "../../classes/structs/SlashCommand";
import {
    ActionRowBuilder,
    ButtonBuilder, Channel, ChannelSelectMenuBuilder, ChatInputCommandInteraction,
    EmbedBuilder,
    Role,
    RoleSelectMenuBuilder,
    SlashCommandBuilder, StringSelectMenuBuilder
} from "discord.js";
import fuse from "fuse.js";
import {ButtonOption, ExtendedClient, GenericPrimitiveOption, ObjectOption, SelectOption} from "../../types";
import Guild from "../../classes/structs/Guild";

function handleBoolean(embed: EmbedBuilder, setting:GenericPrimitiveOption<"boolean">, interaction: ChatInputCommandInteraction, client: ExtendedClient, guild: Guild) {
    return new Promise<{interaction: any, value:boolean, embed: EmbedBuilder}>(async (resolve, reject) => {
        embed.addFields([
            {
                name: 'Valor atual',
                value: setting.value ? 'Ativado' : 'Desativado'
            }
        ])
        const row = new ActionRowBuilder<ButtonBuilder>()
            .setComponents([
                new ButtonBuilder()
                    .setCustomId('edit')
                    .setLabel('Editar')
                    .setStyle(1)
            ])
        const reply = await interaction.reply({embeds: [embed], components: [row], fetchReply: true})
        const collector = reply.createMessageComponentCollector({
            time: 60000,
            filter: (i) => interaction.user.id === i.user.id
        });
        const row2 = new ActionRowBuilder<ButtonBuilder>()
            .setComponents([
                new ButtonBuilder()
                    .setCustomId('true')
                    .setLabel('Ativar')
                    .setStyle(3),
                new ButtonBuilder()
                    .setCustomId('false')
                    .setLabel('Desativar')
                    .setStyle(4)
            ])
        collector.on('collect', async (i) => {
            switch (i.customId) {
                case 'edit':
                    embed.setFooter({text: 'Atualmente editando!'})
                    await i.update({embeds: [embed], components: [row2]})
                    break;
                case 'true':
                    await i.reply({content: 'Atualizando configuração...', ephemeral: true})
                    return resolve({ interaction: i, value: true, embed })
                    /*
                    await client.settingsHandler.setSetting(guild, setting.id, true);
                    await i.editReply({content: 'Configuração atualizada!'})
                    embed.setFooter(null)
                    await i.message.edit({embeds: [embed], components: [row2]})
                     */
                case 'false':
                    await i.reply({content: 'Atualizando configuração...', ephemeral: true})
                    return resolve({ interaction: i, value: false, embed })
                    /*
                    await client.settingsHandler.setSetting(guild, setting.id, false);
                    await i.editReply({content: 'Configuração atualizada!'})
                    embed.setFooter(null)
                    await i.message.edit({embeds: [embed], components: [row2]})
                     */
            }
        })
    })
}
function handleString(embed: EmbedBuilder, setting:GenericPrimitiveOption<"text">, interaction: ChatInputCommandInteraction, client: ExtendedClient, guild: Guild) {
    return new Promise<{interaction: any, value:string, embed: EmbedBuilder}>(async (resolve, reject) => {
        embed.addFields([
            {
                name: 'Valor atual',
                value: setting.value as string || 'Nenhum'
            }
        ])
        const row3 = new ActionRowBuilder<ButtonBuilder>()
            .setComponents([
                new ButtonBuilder()
                    .setCustomId('edit')
                    .setLabel('Editar')
                    .setStyle(1)
            ])
        const reply2 = await interaction.reply({embeds: [embed], components: [row3], fetchReply: true})
        const collector2 = reply2.createMessageComponentCollector({
            time: 60000,
            filter: (i) => interaction.user.id === i.user.id

        });

        collector2.on('collect', async (i) => {
            if (!i.channel) return
            switch (i.customId) {
                case 'edit':
                    embed.setFooter({text: 'Atualmente editando!'})
                    await i.update({embeds: [embed], components: []})
                    const msg = await i.channel.awaitMessages({
                        filter: (m) => m.author.id === interaction.user.id,
                        max: 1,
                        time: 60000
                    }).catch(async () => {
                        embed.setFooter(null)
                        await i.message.edit({embeds: [embed], components: []})
                        i.editReply({content: 'Você não respondeu a tempo!'})
                        return
                    })
                    if (!msg) return
                    const value = msg.first()
                    if (!value) return
                    resolve({ interaction: i, value: value.content, embed })

                    break;
            }
        })
    })
}
function handleNumber(embed: EmbedBuilder, setting:GenericPrimitiveOption<"number">, interaction: ChatInputCommandInteraction, client: ExtendedClient, guild: Guild) {
    return new Promise<{interaction: any, value:string, embed: EmbedBuilder}>(async (resolve, reject) => {
        embed.addFields([
            {
                name: 'Valor atual',
                value: setting.value + '' || 'Nenhum'
            }
        ])
        const row4 = new ActionRowBuilder<ButtonBuilder>()
            .setComponents([
                new ButtonBuilder()
                    .setCustomId('edit')
                    .setLabel('Editar')
                    .setStyle(1)
            ])
        const reply3 = await interaction.reply({embeds: [embed], components: [row4], fetchReply: true})
        const collector3 = reply3.createMessageComponentCollector({
            time: 60000,
            filter: (i) => interaction.user.id === i.user.id
        });

        collector3.on('collect', async (i) => {
            if (!i.channel) return
            switch (i.customId) {
                case 'edit':
                    embed.setFooter({text: 'Atualmente editando!'})
                    await i.update({embeds: [embed], components: []})
                    const msg = await i.channel.awaitMessages({
                        filter: (m) => m.author.id === interaction.user.id,
                        max: 1,
                        time: 60000
                    }).catch(async () => {
                        embed.setFooter(null)
                        await i.message.edit({embeds: [embed], components: []})
                        i.editReply({content: 'Você não respondeu a tempo!'})
                        return
                    })
                    if (!msg) return
                    const value = msg.first()?.content
                    if (!value) return
                    resolve({ interaction: i, value, embed })

                    break;
            }
        })
    })
}
function handleRole(embed: EmbedBuilder, setting:GenericPrimitiveOption<"role">, interaction: ChatInputCommandInteraction, client: ExtendedClient, guild: Guild) {
    return new Promise<{interaction: any, value:Role, embed: EmbedBuilder}>(async (resolve, reject) => {
        embed.addFields([
            {
                name: 'Valor atual',
                value: setting.value ? `${setting.value.toString()}` : 'Nenhum'
            }
        ])
        const row5 = new ActionRowBuilder<ButtonBuilder>()
            .setComponents([
                new ButtonBuilder()
                    .setCustomId('edit')
                    .setLabel('Editar')
                    .setStyle(1)
            ])
        const reply4 = await interaction.reply({embeds: [embed], components: [row5], fetchReply: true})
        const collector4 = reply4.createMessageComponentCollector({
            time: 60000,
            filter: (i) => interaction.user.id === i.user.id
        })

        collector4.on('collect', async (i) => {
            if (!i.channel) return
            switch (i.customId) {
                case 'edit':
                    embed.setFooter({text: 'Atualmente editando!'})
                    const row6 = new ActionRowBuilder<RoleSelectMenuBuilder>()
                        .setComponents([
                            new RoleSelectMenuBuilder()
                                .setCustomId('role')
                                .setPlaceholder('Selecione um cargo')
                                .setMaxValues(1)
                        ])
                    await i.update({embeds: [embed], components: [row6]})
                    const msg = await i.channel.awaitMessageComponent({
                        filter: (m) => m.user.id === interaction.user.id,
                        time: 60000
                    })
                    if (!msg || !msg.isRoleSelectMenu()) return
                    const role = msg.roles.first()
                    if (!role) return
                    // @ts-ignore
                    resolve({ interaction: i, value: role, embed })

                    break;
            }
        })
    })
}
function handleChannel(embed: EmbedBuilder, setting:GenericPrimitiveOption<"channel">, interaction: ChatInputCommandInteraction, client: ExtendedClient, guild: Guild) {
    return new Promise<{interaction: any, value:Channel, embed: EmbedBuilder}>(async (resolve, reject) => {
        embed.addFields([
            {
                name: 'Valor atual',
                value: setting.value ? `${setting.value.toString()}` : 'Nenhum'
            }
        ])
        const row5 = new ActionRowBuilder<ButtonBuilder>()
            .setComponents([
                new ButtonBuilder()
                    .setCustomId('edit')
                    .setLabel('Editar')
                    .setStyle(1)
            ])
        const reply4 = await interaction.reply({embeds: [embed], components: [row5], fetchReply: true})
        const collector4 = reply4.createMessageComponentCollector({
            time: 60000,
            filter: (i) => interaction.user.id === i.user.id
        })

        collector4.on('collect', async (i) => {
            if (!i.channel) return
            switch (i.customId) {
                case 'edit':
                    embed.setFooter({text: 'Atualmente editando!'})
                    const row6 = new ActionRowBuilder<ChannelSelectMenuBuilder>()
                        .setComponents([
                            new ChannelSelectMenuBuilder()
                                .setCustomId('channel')
                                .setPlaceholder('Selecione um chat')
                                .setMaxValues(1)
                        ])
                    await i.update({embeds: [embed], components: [row6]})
                    const msg = await i.channel.awaitMessageComponent({
                        filter: (m) => m.user.id === interaction.user.id,
                        time: 60000
                    })
                    if (!msg || !msg.isChannelSelectMenu()) return
                    const channel = msg.channels.first()
                    if (!channel) return
                    // @ts-ignore
                    resolve({ interaction: i, value: channel, embed })
                    break;
            }
        })
    })
}
function handleButton(embed: EmbedBuilder, setting:ButtonOption, interaction: ChatInputCommandInteraction, client: ExtendedClient, guild: Guild) {
    return new Promise<{interaction: any, value:string, embed: EmbedBuilder}>(async (resolve, reject) => {
        const row5 = new ActionRowBuilder<ButtonBuilder>()
            .setComponents([
                new ButtonBuilder()
                    .setCustomId('activate')
                    .setLabel('Ativar')
                    .setStyle(1)
            ])
        const reply4 = await interaction.reply({embeds: [embed], components: [row5], fetchReply: true})
        const collector4 = reply4.createMessageComponentCollector({
            time: 60000,
            filter: (i) => interaction.user.id === i.user.id
        })

        collector4.on('collect', async (i) => {
            if (!i.channel) return
            switch (i.customId) {
                case 'activate':
                    return resolve({ interaction: i, value: "true", embed })
                    /*

                     */
            }
        })
    })
}
function handleSelect(embed: EmbedBuilder, setting:SelectOption, interaction: ChatInputCommandInteraction, client: ExtendedClient, guild: Guild) {
    return new Promise<{interaction: any, value:string[], embed: EmbedBuilder}>(async (resolve, reject) => {
        const values = setting.options.filter((o) => (setting.value ? setting.value?.includes(o.id) : (setting.default ? setting.default?.includes(o.id) : false)))
        embed.addFields([
            {
                name: 'Valor atual',
                value: values.length > 0 ? values.map((v) => v.name).join(', ') : 'Nenhum'
            }
        ])
        const row5 = new ActionRowBuilder<ButtonBuilder>()
            .setComponents([
                new ButtonBuilder()
                    .setCustomId('edit')
                    .setLabel('Editar')
                    .setStyle(1)
            ])
        const reply4 = await interaction.reply({embeds: [embed], components: [row5], fetchReply: true})
        const collector4 = reply4.createMessageComponentCollector({
            time: 60000,
            filter: (i) => interaction.user.id === i.user.id
        })

        collector4.on('collect', async (i) => {
            if (!i.channel) return
            switch (i.customId) {
                case 'edit':
                    embed.setFooter({text: 'Atualmente editando!'})
                    const row6 = new ActionRowBuilder<StringSelectMenuBuilder>()
                        .setComponents([
                            new StringSelectMenuBuilder()
                                .setCustomId('select')
                                .setPlaceholder('Selecione uma opcão')
                                .setMaxValues(setting.max === 0? setting.options.length : setting.max)
                                .setMinValues(setting.min)
                                .setOptions(setting.options.map((o) => {
                                    return {
                                        label: o.name,
                                        value: o.id
                                    }
                                }))
                        ])
                    await i.update({embeds: [embed], components: [row6]})
                    const msg = await i.channel.awaitMessageComponent({
                        filter: (m) => m.user.id === interaction.user.id,
                        time: 60000
                    })
                    if (!msg || !msg.isStringSelectMenu()) return
                    const values = msg.values
                    if (!values) return
                    return resolve({ interaction: i, value: values, embed })
            }
        })
    })
}
function handleUser(embed: EmbedBuilder, setting:GenericPrimitiveOption<"user">, interaction: ChatInputCommandInteraction, client: ExtendedClient, guild: Guild) {
    return new Promise<{interaction: any, value:string, embed: EmbedBuilder}>(async (resolve, reject) => {
        embed.addFields([
            {
                name: 'Valor atual',
                value: setting.value?.toString() || 'Nenhum'
            }
        ])
        const row3 = new ActionRowBuilder<ButtonBuilder>()
            .setComponents([
                new ButtonBuilder()
                    .setCustomId('edit')
                    .setLabel('Editar')
                    .setStyle(1)
            ])
        const reply2 = await interaction.reply({embeds: [embed], components: [row3], fetchReply: true})
        const collector2 = reply2.createMessageComponentCollector({
            time: 60000,
            filter: (i) => interaction.user.id === i.user.id

        });

        collector2.on('collect', async (i) => {
            if (!i.channel) return
            switch (i.customId) {
                case 'edit':
                    embed.setFooter({text: 'Atualmente editando!'})
                    await i.update({embeds: [embed], components: []})
                    const msg = await i.channel.awaitMessages({
                        filter: (m) => m.author.id === interaction.user.id,
                        max: 1,
                        time: 60000
                    }).catch(async () => {
                        embed.setFooter(null)
                        await i.message.edit({embeds: [embed], components: []})
                        i.editReply({content: 'Você não respondeu a tempo!'})
                        return
                    })
                    if (!msg) return
                    const value = msg.first()
                    if (!value) return
                    const user = value.mentions.members?.first() || await client.users.fetch(value.content).catch(() => null)
                    if (!user) {
                        embed.setFooter(null)
                        await i.message.edit({embeds: [embed], components: []})
                        i.editReply({content: 'Usuário não encontrado!'})
                        return
                    }
                    resolve({ interaction: i, value: user.id, embed })
                    /*
                    await client.settingsHandler.setSetting(guild, setting.id, user.id)
                        .then(async () => {
                            await i.editReply({content: 'Configuração atualizada!'})
                            embed.setFooter(null)
                            embed.setFields([
                                {
                                    name: 'Valor atual',
                                    value: user.toString()
                                }
                            ])
                            await i.message.edit({embeds: [embed], components: [row3]})
                        })
                        .catch(async (err) => {
                            embed.setFooter(null)
                            await i.message.edit({embeds: [embed], components: [row3]})
                            return i.editReply({content: 'Ocorreu um erro ao atualizar a configuração!\n' + err.reason})
                        })
                     */
                    break;
            }
        })
    })
}
function handleObject(embed: EmbedBuilder, setting:ObjectOption, interaction: ChatInputCommandInteraction, client: ExtendedClient, guild: Guild) {
    return new Promise(async (resolve, reject) => {


        const values = setting.value?.filter((o) => (setting.value ? setting.value?.includes(o) : (setting.default ? setting.default?.includes(o) : false)))
        // @ts-ignore
        if (values?.length || -1 > 0) {
            const a = values as {id: string, value: string | number | boolean}[]

            embed.addFields([
                {
                    name: 'Valor atual',
                    value: a.map((v) => {
                        const Setting = setting.structure.find((s) => s.id === v.id)
                        if (!Setting) return
                        return `${Setting.name} (${Setting.type}): ${v.value}`
                    }).join(', ')
                }
            ])
        } else {
            embed.addFields([
                {
                    name: 'Valor atual',
                    value: 'Nenhum'
                }
            ])
        }
        const row5 = new ActionRowBuilder<ButtonBuilder>()
            .setComponents([
                new ButtonBuilder()
                    .setCustomId('edit')
                    .setLabel('Editar')
                    .setStyle(1)
            ])
        const reply4 = await interaction.reply({embeds: [embed], components: [row5], fetchReply: true})
        const collector4 = reply4.createMessageComponentCollector({
            time: 60000,
            filter: (i) => interaction.user.id === i.user.id
        })

        collector4.on('collect', async (i) => {
            if (!i.channel) return
            switch (i.customId) {
                case 'edit':
                    embed.setFooter({text: 'Atualmente editando!'})
                    const row6 = new ActionRowBuilder<StringSelectMenuBuilder>()
                        .setComponents([
                            new StringSelectMenuBuilder()
                                .setCustomId('select')
                                .setPlaceholder('Selecione uma opcão')
                                .setOptions(setting.structure.map((o) => {
                                    return {
                                        label: o.name,
                                        value: o.id
                                    }
                                }))
                        ])
                    await i.update({embeds: [embed], components: [row6]})
                    const msg = await i.channel.awaitMessageComponent({
                        filter: (m) => m.user.id === interaction.user.id,
                        time: 60000
                    })
                    if (!msg || !msg.isStringSelectMenu()) return
                    const value = msg.values[1]
                    if (!value) return
                    /*
                    await client.settingsHandler.setSetting(guild, setting.id, values)
                        .then(async () => {
                            const currentValues = setting.options.filter((o) => values ? values.includes(o.id): false)
                            await i.editReply({content: 'Configuração atualizada!'})
                            embed.setFooter(null)
                            embed.setFields([
                                {
                                    name: 'Valor atual',
                                    value: currentValues.length > 0 ? currentValues.map((v) => v.name).join(', ') : 'Nenhum'
                                }
                            ])
                            await i.message.edit({embeds: [embed], components: []})
                        })
                        .catch(async (err) => {
                            embed.setFooter(null)
                            await i.message.edit({embeds: [embed], components: []})
                            i.editReply({content: 'Ocorreu um erro ao atualizar a configuração!\n' + err.reason})
                            return
                        })
                     */
                    break;
            }
        })
    })
}
export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setDescription(`Mostra todas as configurações do servidor`)
        .addStringOption(option =>
            option
                .setName('configuração')
                .setDescription('Nome da configuração para pesquisar')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .setName('configurações'),
    func: async ({interaction, client, guild}) => {
        if (!interaction.inGuild()) return interaction.reply({
            content: 'Este comando só pode ser usado em servidores',
            ephemeral: true
        });
        const setting = guild.settings.find(setting => setting.id === interaction.options.getString('configuração'));
        if (!setting) return interaction.reply({content: 'Configuração não encontrada.. :(', ephemeral: true});
        const embed = new EmbedBuilder()
            .setTitle(`Configuração: ${setting.name}`)
            .setDescription(setting.description)
            .setColor('#4040F0')
        switch (setting.type) {
            case 'boolean':
                const result8 = await handleBoolean(embed, setting as GenericPrimitiveOption<"boolean">, interaction, client, guild)
                await client.settingsHandler.setSetting(guild, setting.id, result8.value)
                    .then(async () => {
                        await result8.interaction.editReply({content: 'Configuração atualizada!'})
                        embed.setFooter(null)
                        embed.setFields([
                            {
                                name: 'Valor atual',
                                value: result8.value ? 'Ativado' : 'Desativado'
                            }
                        ])
                        await result8.interaction.message.edit({embeds: [embed], components: []})
                    })
                    .catch(async (err) => {
                        embed.setFooter(null)
                        await result8.interaction.message.edit({embeds: [embed], components: []})
                        return result8.interaction.editReply({content: 'Ocorreu um erro ao atualizar a configuração!\n' + err.reason})
                    })
                break;
            case 'text':
                const result7 = await handleString(embed, setting as GenericPrimitiveOption<"text">, interaction, client, guild)
                await client.settingsHandler.setSetting(guild, setting.id, result7.value)
                    .then(async () => {
                        await result7.interaction.editReply({content: 'Configuração atualizada!'})
                        embed.setFooter(null)
                        embed.setFields([
                            {
                                name: 'Valor atual',
                                value: result7.value
                            }
                        ])
                        await result7.interaction.message.edit({embeds: [embed], components: []})
                    })
                    .catch(async (err) => {
                        embed.setFooter(null)
                        await result7.interaction.message.edit({embeds: [embed], components: []})
                        return result7.interaction.editReply({content: 'Ocorreu um erro ao atualizar a configuração!\n' + err.reason})
                    })
                break;
            case 'number':
                const result6 = await handleNumber(embed, setting as GenericPrimitiveOption<"number">, interaction, client, guild)
                await client.settingsHandler.setSetting(guild, setting.id, Number(result6.value))
                    .then(async () => {
                        await result6.interaction.editReply({content: 'Configuração atualizada!'})
                        embed.setFooter(null)
                        embed.setFields([
                            {
                                name: 'Valor atual',
                                value: result6.value
                            }
                        ])
                        await result6.interaction.message.edit({embeds: [embed], components: []})
                    })
                    .catch(async (err) => {
                        embed.setFooter(null)
                        await result6.interaction.message.edit({embeds: [embed], components: []})
                        return result6.interaction.editReply({content: 'Ocorreu um erro ao atualizar a configuração!\n' + err.reason})
                    })
                break;
            case 'role':
                const result5 = await handleRole(embed, setting as GenericPrimitiveOption<"role">, interaction, client, guild)
                await client.settingsHandler.setSetting(guild, setting.id, result5.value.id)
                    .then(async () => {
                        await result5.interaction.editReply({content: 'Configuração atualizada!'})
                        embed.setFooter(null)
                        embed.setFields([
                            {
                                name: 'Valor atual',
                                value: result5.value.toString()
                            }
                        ])
                        await result5.interaction.message.edit({embeds: [embed], components: []})
                    })
                    .catch(async (err) => {
                        embed.setFooter(null)
                        await result5.interaction.message.edit({embeds: [embed], components: []})
                        result5.interaction.editReply({content: 'Ocorreu um erro ao atualizar a configuração!\n' + err.reason})
                        return
                    })
                break;
            case "channel":
                const result4 = await handleChannel(embed, setting as GenericPrimitiveOption<"channel">, interaction, client, guild)
                await client.settingsHandler.setSetting(guild, setting.id, result4.value.id)
                    .then(async () => {
                        await result4.interaction.editReply({content: 'Configuração atualizada!'})
                        embed.setFooter(null)
                        embed.setFields([
                            {
                                name: 'Valor atual',
                                value: result4.value.toString()
                            }
                        ])
                        await result4.interaction.message.edit({embeds: [embed], components: []})
                    })
                    .catch(async (err) => {
                        embed.setFooter(null)
                        await result4.interaction.message.edit({embeds: [embed], components: []})
                        result4.interaction.editReply({content: 'Ocorreu um erro ao atualizar a configuração!\n' + err.reason})
                        return
                    })
                break;
            case "button":
                const result3 = await handleButton(embed, setting, interaction, client, guild)
                await client.settingsHandler.setSetting(guild, setting.id, true)
                    .then(async () => {
                        await result3.interaction.editReply({content: 'Efetuado!'})
                        await result3.interaction.message.edit({embeds: [embed]})
                    })
                    .catch(async (err) => {
                        result3.interaction.editReply({content: 'Ocorreu um erro ao atualizar a configuração!\n' + err.reason})
                        return
                    })
                break;
            case "select":
                const result2 = await handleSelect(embed, setting, interaction, client, guild)
                await client.settingsHandler.setSetting(guild, setting.id, result2.value)
                    .then(async () => {
                        const currentValues = setting.options.filter((o) => result2.value ? result2.value.includes(o.id): false)
                        await result2.interaction.editReply({content: 'Configuração atualizada!'})
                        result2.embed.setFooter(null)
                        result2.embed.setFields([
                            {
                                name: 'Valor atual',
                                value: currentValues.length > 0 ? currentValues.map((v) => v.name).join(', ') : 'Nenhum'
                            }
                        ])
                        await result2.interaction.message.edit({embeds: [result2.embed], components: []})
                    })
                    .catch(async (err) => {
                        result2.embed.setFooter(null)
                        await result2.interaction.message.edit({embeds: [result2.embed], components: []})
                        result2.interaction.editReply({content: 'Ocorreu um erro ao atualizar a configuração!\n' + err.reason})
                        return
                    })
                break;
            case "user":
                const result = await handleUser(embed, setting as GenericPrimitiveOption<"user">, interaction, client, guild)
                await client.settingsHandler.setSetting(guild, setting.id, result.value)
                    .then(async () => {
                        await result.interaction.editReply({content: 'Configuração atualizada!'})
                        embed.setFooter(null)
                        embed.setFields([
                            {
                                name: 'Valor atual',
                                value: `<@${result.value}>`
                            }
                        ])
                        await result.interaction.message.edit({embeds: [embed], components: []})
                    })
                    .catch(async (err) => {
                        embed.setFooter(null)
                        await result.interaction.message.edit({embeds: [embed], components: []})
                        return result.interaction.editReply({content: 'Ocorreu um erro ao atualizar a configuração!\n' + err.reason})
                    })
                break;
            case "object":
                await handleObject(embed, setting as ObjectOption, interaction, client, guild)
                break;

        }
    },
    global: true,
    autoCompleteFunc: async ({interaction, client}) => {
        if (!interaction.inGuild()) return interaction.respond([{
            name: 'Este comando só pode ser usado em servidores',
            value: 'null'
        }]);
        const guildData = await client.guildHandler.fetchOrCreate(interaction.guildId);
        const result = new fuse(guildData.settings, {
            keys: ['name', 'id'],
            includeScore: true,
            threshold: 0.3
        })
        const settings = result.search(interaction.options.getString('configuração') || 'a').map(result => result.item);
        await interaction.respond(settings.map(setting => {
            return {
                name: `${setting.name} (${setting.type})`,
                value: setting.id
            }
        }))
    }
})