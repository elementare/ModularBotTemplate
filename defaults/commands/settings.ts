import SlashCommand from "../../classes/structs/SlashCommand";
import {
    SlashCommandBuilder,
    ComponentType,
    PermissionsBitField
} from "discord.js";
import fuse from "fuse.js";

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
        const setting = guild.settings.find(setting => setting.eventName === interaction.options.getString('configuração'));
        if (!setting) return interaction.reply({content: 'Configuração não encontrada.. :(', ephemeral: true});
        client.emit(setting.eventName, interaction, guild);
    },
    global: true,
    autoCompleteFunc: async ({interaction, client}) => {
        if (!interaction.inGuild()) return interaction.respond([{
            name: 'Este comando só pode ser usado em servidores',
            value: 'null'
        }]);
        const guildData = await client.guildHandler.fetchOrCreate(interaction.guildId);
        const result = new fuse([...guildData.settings.values()], {
            keys: ['name', 'eventName'],
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
                value: setting.eventName
            }
        }))
    }
})