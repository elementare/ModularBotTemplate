import SlashCommand from "../../classes/structs/SlashCommand";
import {
    SlashCommandBuilder,
    ComponentType,
    PermissionsBitField, ChatInputCommandInteraction
} from "discord.js";
import fuse from "fuse.js";
import {Logger} from "winston";
import fs from "fs";
import path from "path";
import {SavedSetting, SettingStructure, typeFile} from "../../types";
function findJsFiles(dir: string): Array<typeFile> {
    let results: Array<typeFile> = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.resolve(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            results = results.concat(findJsFiles(filePath));
        } else if (path.extname(filePath) === '.ts' || path.extname(filePath) === '.js') {
            const event = require(filePath)
            results.push(event.default);
        }
    }
    return results;
}
const typesArr = findJsFiles('./settingsTypes')
const types = new Map<string, (interaction: ChatInputCommandInteraction, types: typeFile[] ,currentConfig: SavedSetting ) => any>((typesArr).map(type => [type.name, type.run]))

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
        // TODO
        const type = types.get(setting.type);
        if (!type) return interaction.reply({content: 'Tipo de configuração não encontrado.. :(', ephemeral: true});
        const result = await type(interaction,typesArr, setting).catch(() => undefined)
        if (!result) return
        await client.settingsHandler.setSetting(guild, setting.name, JSON.stringify(result));
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