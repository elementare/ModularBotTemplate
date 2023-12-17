import SlashCommand from "../../classes/structs/SlashCommand";
import {
    SlashCommandBuilder,
    PermissionsBitField,
    GuildTextBasedChannel
} from "discord.js";
import fuse from "fuse.js";
import {InteractionView} from "../../utils/InteractionView";
import {typeFile} from "../../types";

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
        const setting = guild.settings.find(setting => setting.name === interaction.options.getString('configuração'));
        if (!setting) return interaction.reply({content: 'Configuração não encontrada.. :(', ephemeral: true});

        const view = new InteractionView(interaction, interaction.channel as GuildTextBasedChannel, client, {
            filter: (i) => i.user.id === interaction.user.id,
            timeout: 4 * 60 * 1000
        })
        view.once('end', (reason) => {
            if (reason !== 'time') return
            view.update({
                embeds: [],
                components: [],
                content: 'Tempo esgotado'
            })
        })
        const result = await setting.run(view);
        if (!result) return
        if (setting.save) {
            await setting.save(guild, result)
        } else {
            await client.settingsHandler.setSetting(guild, setting.name, JSON.stringify(result))
        }


    },
    global: true,
    autoCompleteFunc: async ({interaction, client}) => {
        if (!interaction.inGuild()) return interaction.respond([{
            name: 'Este comando só pode ser usado em servidores',
            value: 'null'
        }]);
        const guildData = await client.guildHandler.fetchOrCreate(interaction.guildId);
        const result = new fuse([...guildData.settings.values()], {
            keys: ['name'],
            includeScore: true,
            threshold: 0.25
        })
        const settings = (result.search(interaction.options.getString('configuração') || 'a').map(result => result.item)).filter(setting => {
            if (typeof interaction.member.permissions === 'string') return false
            return interaction.member.permissions.has(setting.permission || PermissionsBitField.Flags.SendMessages)
        });
        await interaction.respond(settings.map(setting => {
            return {
                name: `${setting.name}`,
                value: setting.name
            }
        }))
    }
})