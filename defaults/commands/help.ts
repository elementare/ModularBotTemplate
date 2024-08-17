import SlashCommand from "../../classes/structs/SlashCommand";
import {
    ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionsBitField,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    TextBasedChannel
} from "discord.js";
import fuse from "fuse.js";
import {InteractionView} from "../../utils/InteractionView";
import {arrayChunk} from "../../util/arrayRelated";
import Command from "../../classes/structs/Command";
import {ExtendedClient, Module} from "../../types";

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

async function sendCommandDesc(commandType: string, client: ExtendedClient, commandName: string, interaction: ChatInputCommandInteraction<CacheType> | ButtonInteraction) {
    if (commandType === 'text') {
        const command = client.commands.text.get(commandName);
        if (!command) return;
        const locale = interaction.locale
        const acceptedLocale: string = locales.includes(locale) ? locale : 'pt-BR'
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
        await interaction.reply({embeds: [embed]})
    } else if (commandType === 'slash') {
        const command = client.commands.slash.get(commandName);
        if (!command) return;
        const locale = interaction.locale
        const acceptedLocale: string = locales.includes(locale) ? locale : 'pt-BR'
        const currentLocale = acceptedLocales.get(acceptedLocale) ?? acceptedLocales.get('pt-BR') as Map<string, string>

        const embed = new EmbedBuilder()
            .setTitle(`${currentLocale.get('word1')}: ${command.data.name_localizations ? command.data.name_localizations[locale] || command.data.name : command.data.name}`)
            .setDescription(command.data.description_localizations ? command.data.description_localizations[locale] || command.data.description : command.data.description)
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
        await interaction.reply({embeds: [embed]})
    }
}

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
            await sendCommandDesc(commandType, client, commandName, interaction);
        } else {
            const modulesWithCommands = client.modules.filter(module => module.commands?.text || module.commands?.slash)
            const mainEmbed = new EmbedBuilder()
                .setTitle('Módulos')
                .setFields(
                    modulesWithCommands.map(module => {
                        const moduleObj = client.modules.get(module.name) as Module
                        const name = moduleObj.interfacer.publicName || module.name
                        const description = moduleObj.interfacer.publicDescription || module.description
                        return {
                            name,
                            value: description,
                            inline: true
                        }
                    })
                )
                .setColor('#4040F0')
            const view = new InteractionView(interaction, interaction.channel as TextBasedChannel, client, {
                filter: (i) => i.user.id === interaction.user.id,
            })
            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .setComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId('moduleSelect')
                        .setOptions(
                            modulesWithCommands.map(module => {
                                return {
                                    label: module.name,
                                    value: module.name
                                }
                            })
                        )
                ])
            await view.update({
                embeds: [mainEmbed],
                components: [row]
            })
            const pages: {
                embed: EmbedBuilder,
                commands: {label: string, value: string, name: string, command: Command | SlashCommand}[],
                selector: ActionRowBuilder<ButtonBuilder>
            }[] = []
            const select = new ActionRowBuilder<StringSelectMenuBuilder>()
                .setComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId('commandSelect')
                ])
            const selector = new ActionRowBuilder<ButtonBuilder>()
            view.on("moduleSelect", async (interaction) => {
                const module = modulesWithCommands.find(module => module.name === interaction.values[0])
                if (!module) return;
                const textCommands = module.commands?.text.map((command,key) => {
                    if (command.aliases.includes(key)) return;
                    return { label: command.name, value: `Tipo: Texto`, name: command.name, command: command}
                }).filter((command) => command !== undefined) as { label: string, value: string, name: string, command: Command}[] | undefined
                const slashCommands = module.commands?.slash.map((command) => {
                    return { label: `${command.data.name}`, value: `Tipo: Slash`, name: command.data.name, command: command}
                })
                const commands = [...(textCommands || []), ...(slashCommands || [])]
                const chunkedCommands = arrayChunk(commands, 24)
                await interaction.deferUpdate()
                for (let i = 0; i < chunkedCommands.length; i++) {
                    const chunk = chunkedCommands[i]
                    const embed = new EmbedBuilder()
                        .setTitle(`Comandos do módulo ${module.name}`)
                        .setFields(chunk)
                        .setColor('#4040F0')
                        .setFooter({ text: `Página ${i + 1} de ${chunkedCommands.length}` })
                    pages.push({
                        embed: embed,
                        commands: chunk,
                        selector: selector
                    })
                }

                selector
                    .setComponents([
                        new ButtonBuilder({
                            customId: 'main',
                            label: 'Voltar',
                            style: ButtonStyle.Primary
                        }),
                        new ButtonBuilder({
                            customId: 'nextPageSelect-1',
                            label: 'Proxima página',
                            style: ButtonStyle.Primary,
                            disabled: pages.length === 1
                        }),
                        new ButtonBuilder({
                            customId: 'backPageSelect',
                            label: 'Página anterior',
                            style: ButtonStyle.Primary,
                            disabled: true
                        }),
                    ])
                select.components[0].setOptions(pages[0].commands.map(command => {
                    return {
                        label: command.label,
                        value: `${command.command.data ? 'slash' : 'text'}-${command.name}`,
                    }
                }))
                await view.update({
                    embeds: [pages[0].embed],
                    components: [selector, select]
                })

            })

            view.on("nextPageSelect", async (interaction: ButtonInteraction, args: string[]) => {
                const nextIndex = parseInt(args[0])
                const page = pages[nextIndex]
                await interaction.deferUpdate()
                page.selector.components[1]
                    .setCustomId(`nextPageSelect-${nextIndex + 1}`)
                    .setDisabled(nextIndex === pages.length - 1)
                page.selector.components[2]
                    .setCustomId(`backPageSelect-${nextIndex - 1}`)
                    .setDisabled(nextIndex === 0)
                select.components[0].setOptions(page.commands)
                await view.update({
                    embeds: [page.embed],
                    components: [page.selector, select]
                })
            })
            view.on("backPageSelect", async (interaction: ButtonInteraction, args: string[]) => {
                const nextIndex = parseInt(args[0])
                const page = pages[nextIndex]
                await interaction.deferUpdate()
                page.selector.components[1]
                    .setCustomId(`nextPageSelect-${nextIndex + 1}`)
                    .setDisabled(nextIndex === pages.length - 1)
                page.selector.components[2]
                    .setCustomId(`backPageSelect-${nextIndex - 1}`)
                    .setDisabled(nextIndex === 0)
                select.components[0].setOptions(page.commands)
                await view.update({
                    embeds: [page.embed],
                    components: [page.selector, select]
                })
            })
            view.on("main", async (interaction) => {
                await interaction.deferUpdate()
                await view.update({
                    embeds: [mainEmbed],
                    components: [row]
                })
            })
            view.on("commandSelect", async (interaction) => {
                const command = interaction.values[0].split('-')
                const commandType = command[0];
                const commandName = command[1];
                selector.components[0].setDisabled(true)
                await view.update({
                    components: [selector]
                })
                await sendCommandDesc(commandType, client, commandName, interaction);
            })
        }
    },
    global: true,
    autoCompleteFunc: async ({logger, interaction, client}) => {
        logger.debug('AutoCompleteFunc called')
        const text = interaction.options.getString('comando')
        const moduleFuse = new fuse(client.modules.map(module => module.name), {
            includeScore: true,
            threshold: 0.85
        })
        const module = moduleFuse.search(text || '').map(result => result.item)[0]
        if (module) {
            const moduleObj = client.modules.get(module);
            if (!moduleObj) return;
            const textCommands = moduleObj.commands?.text.map((command,key) => {
                if (command.aliases.includes(key) || !command.shouldAppearInHelp) return;
                return {name: `[${command.module} - Text] ${command.name}`, value: `text-${command.name}`}
            }).filter((command) => command !== undefined) as {name: string, value: string}[]
            const slashCommands = moduleObj.commands?.slash.map((command) => {
                if (!command.shouldAppearInHelp) return;
                return {name: `[${command.module} - Slash] ${command.data.name}`, value: `slash-${command.data.name}`}
            }).filter((command) => command !== undefined) as {name: string, value: string}[]

            if (!textCommands && !slashCommands) return;
            const commands = textCommands?.concat(slashCommands || []) ?? slashCommands;
            if (!commands) return;
            await interaction.respond(commands.slice(0, 24))
        }
        else {
            const exists: string[] = []
            const textCommands = client.commands.text.map((command,key) => {
                if (exists.includes(command.name) || !command.shouldAppearInHelp) return;
                exists.push(command.name)
                return {name: `[${command.module} - Text] ${command.name}`, value: `text-${command.name}`}
            }).filter((command) => command !== undefined) as {name: string, value: string}[]
            const slashCommands = client.commands.slash.filter(command => interaction.memberPermissions?.has(BigInt(command.data.default_member_permissions || PermissionsBitField.Flags.SendMessages))).map(command => {
                if (!command.shouldAppearInHelp) return;
                return {name: `[${command.module} - Slash] ${command.data.name}`, value: `slash-${command.data.name}`}
            }).filter((command) => command !== undefined) as {name: string, value: string}[]
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