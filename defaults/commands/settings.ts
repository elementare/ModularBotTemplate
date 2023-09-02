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
        const typeSplit = setting.type.split('-');
        const baseTypeName = typeSplit[0];
        const modifier = typeSplit[1];
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

        // This is so if you have a custom array type for a certain type it gets used or if its just o normal type without a modifier, it uses the normal type
        if (client.typesCollection.has(setting.type)) {
            const type = client.typesCollection.get(setting.type);
            if (!type) return interaction.reply({content: 'Tipo de configuração não encontrado.. :(', ephemeral: true});
            const result = await type.run(view,Array.from(client.typesCollection.values()), setting).catch(() => undefined)
            if (!result) return
            await client.settingsHandler.setSetting(guild, setting.name, JSON.stringify(result));
            return
        }


        if (modifier && client.typesCollection.has(baseTypeName)) {
            const baseType = client.typesCollection.get(baseTypeName) as typeFile;
            const modifierType = baseType.complex ? client.typesCollection.get('complex-arr') : client.typesCollection.get(modifier);
            if (!modifierType) return interaction.reply({content: 'Tipo de configuração não encontrado.. :(', ephemeral: true});
            const result = await modifierType.run(view,Array.from(client.typesCollection.values()), setting).catch(() => undefined)
            if (!result) return
            await client.settingsHandler.setSetting(guild, setting.name, JSON.stringify(result));
            return
        }
        return interaction.reply({content: 'Tipo de configuração não encontrado.. :(', ephemeral: true});
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
                value: setting.name
            }
        }))
    }
})