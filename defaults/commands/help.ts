import SlashCommand from "../../classes/structs/SlashCommand";
import {EmbedBuilder, PermissionsBitField, SlashCommandBuilder} from "discord.js";
import fuse from "fuse.js";

const locales = ['pt-BR', 'en-US'];
const acceptedLocales = new Map([
    ['pt-BR', new Map([
        ['word1', 'Comando'],
        ['phrase1', 'Como usar'],
        ['phrase2', 'Formas alternativas'],
        ['word2', 'Opções'],
        ['word3', 'Obrigatório'],
        ['word4', 'Nenhuma'],
    ])],
    ['en-US', new Map([
        ['word1', 'Command'],
        ['phrase1', 'How to use'],
        ['phrase2', 'Aliases'],
        ['word2', 'Options'],
        ['word3', 'Required'],
        ['word4', 'None'],
    ])],
    ['es-ES', new Map([
        ['word1', 'Comando'],
        ['phrase1', 'Como usar'],
        ['phrase2', 'Formas alternativas'],
        ['word2', 'Opciones'],
        ['word3', 'Obligatorio'],
        ['word4', 'Ninguno'],
    ])]
])

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setDescription(`Mostra todos os comandos do bot ou informações sobre um comando específico`)
        .setDescriptionLocalizations({
            'pt-BR': 'Mostra todos os comandos do bot ou informações sobre um comando específico',
            'en-US': 'Shows all commands or information about a specific command'
        })
        .setName('ajuda')
        .setNameLocalizations({
            'pt-BR': 'ajuda',
            'en-US': 'help'
        })
        .addStringOption(option =>
            option
                .setName('comando')
                .setNameLocalizations({
                    'pt-BR': 'comando',
                    'en-US': 'command'
                })
                .setDescription('Nome do comando para pesquisar')
                .setDescriptionLocalizations({
                    'pt-BR': 'Nome do comando para pesquisar',
                    'en-US': 'Command name'
                })
                .setRequired(false)
                .setAutocomplete(true)
        ),
    func: async ({interaction, client}) => {
        const option = interaction.options.getString('comando');
        if (option) {
            const command = option.split('-')
            const commandType = command[0];
            const commandName = command[1];
            if (commandType === 'text') {
                const command = client.commands.text.get(commandName);
                if (!command) return;
                const locale = interaction.locale
                const acceptedLocale:string = locales.includes(locale) ? locale : 'pt-BR'
                const currentLocale = acceptedLocales.get(acceptedLocale) ?? acceptedLocales.get('pt-BR') as Map<string, string>
                const embed = new EmbedBuilder()
                    .setTitle(`${currentLocale.get('word1')}: ${command.name}`)
                    .setDescription(command.description)
                    .addFields([
                        {
                            name: currentLocale.get('phrase1') ?? 'Como usar',
                            value: command.howToUse
                        },
                        {
                            name: currentLocale.get('phrase2') ?? 'Formas alternativas',
                            value: command.aliases.join(', ') || currentLocale.get('word4') || 'Nenhuma'
                        }
                    ])
                    .setColor('#4040F0')
                await interaction.reply({ embeds: [embed] })
            } else if (commandType === 'slash') {
                const command = client.commands.slash.get(commandName);
                if (!command) return;
                const locale = interaction.locale
                const acceptedLocale:string = locales.includes(locale) ? locale : 'pt-BR'
                const currentLocale = acceptedLocales.get(acceptedLocale) ?? acceptedLocales.get('pt-BR') as Map<string, string>

                const embed = new EmbedBuilder()
                    .setTitle(`${currentLocale.get('word1')}: ${command.data.name_localizations? command.data.name_localizations[locale] || command.data.name : command.data.name}`)
                    .setDescription(command.data.description_localizations? command.data.description_localizations[locale] || command.data.description : command.data.description)
                    .addFields([
                        {
                            name: currentLocale.get('word2') ?? 'Opções',
                            value: command.data.options?.map(option => {
                                const optionObj = option.toJSON()
                                return `**${optionObj.name_localizations ? optionObj.name_localizations[locale] || optionObj.name : optionObj.name}** ${optionObj.required ? `*${currentLocale.get('word3') ?? 'Obrigatório'}*` : ""} - ${optionObj.description_localizations ? optionObj.description_localizations[locale] || optionObj.description : optionObj.description}`
                            }).join('\n') || currentLocale.get('word4') || 'Nenhuma'
                        }
                    ])
                    .setColor('#4040F0')
                await interaction.reply({ embeds: [ embed ] })
            }
        }

    },
    global: true,
    autoCompleteFunc: async ({logger, interaction, client}) => {
        logger.debug('AutoCompleteFunc called')
        const text = interaction.options.getString('comando')
        const moduleFuse = new fuse(client.modules.map(module => module.name), {
            includeScore: true,
            threshold: 0.25
        })
        const module = moduleFuse.search(text || '').map(result => result.item)[0]
        if (module) {
            const moduleObj = client.modules.get(module);
            if (!moduleObj) return;
            const textCommands = moduleObj.commands?.text.map(command => {
                return {name: `[${command.module} - Text] ${command.name}`, value: `text-${command.name}`}
            })
            const slashCommands = moduleObj.commands?.slash.map(command => {
                return {name: `[${command.module} - Slash] ${command.data.name}`, value: `slash-${command.data.name}`}
            })
            if (!textCommands && !slashCommands) return;
            const commands = textCommands?.concat(slashCommands || []) ?? slashCommands;
            if (!commands) return;
            await interaction.respond(commands.slice(0, 24))
        }
        else {
            const textCommands = client.commands.text.map(command => {
                return {name: `[${command.module} - Text] ${command.name}`, value: `text-${command.name}`}
            });
            const slashCommands = client.commands.slash.filter(command => interaction.memberPermissions?.has(BigInt(command.data.default_member_permissions || PermissionsBitField.Flags.SendMessages))).map(command => {
                return {name: `[${command.module} - Slash] ${command.data.name}`, value: `slash-${command.data.name}`}
            });
            const commands = textCommands.concat(slashCommands);
            const fuseOptions = {
                includeScore: false,
                keys: ['name'],
            }
            const Fuse = new fuse(commands, fuseOptions);
            const result = Fuse.search(interaction.options.getString('comando') || 'a');
            await interaction.respond(result.slice(0, 24).map(command => {
                return {
                    name: command.item.name,
                    value: command.item.value
                }
            }));
        }
    }
})