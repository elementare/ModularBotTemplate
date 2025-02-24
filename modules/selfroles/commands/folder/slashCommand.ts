import SlashCommand from "../../../../classes/structs/SlashCommand";
import {
    ActionRowBuilder,
    ComponentEmojiResolvable,
    EmojiResolvable,
    GuildEmoji,
    Interaction,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
} from "discord.js";
import fuse from "fuse.js";
import {Preset} from "../../types";
import dotenv from 'dotenv';
import sharp from "sharp";
import {sleep} from "../../../../util/sleep";

dotenv.config();

async function createColorEmoji(interaction: Interaction, emojiName: string, colorHex: string, guildId: string) {
    try {
        const size = 64;
        const circleMask = Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
                <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
            </svg>`
        );

        const imageBuffer = await sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: colorHex,
            },
        })
            .png()
            .composite([{input: circleMask, blend: 'dest-in'}]) // Aplica a máscara circular
            .toBuffer();


        const guild = await interaction.client.guilds.fetch(guildId);

        // console.log(`Emoji criado: ${emoji.name}`);

        return await guild.emojis.create({
            attachment: imageBuffer,
            name: emojiName
        })

    } catch (error) {
        console.error('Erro ao criar emoji:', error);
        return undefined;
    }
}

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setDefaultMemberPermissions(8)
        .setName('registro')
        .setDescription('.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('enviar')
                .setNameLocalizations({
                    'pt-BR': 'enviar',
                    'en-US': 'send'
                })
                .setDescription('Envia um preset de registro')
                .addStringOption(option =>
                    option
                        .setName('preset')
                        .setDescription('O preset de ticket que você deseja enviar')
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        )
    ,
    func: async ({interaction, guild, logger}) => {
        if (!interaction.channel) return interaction.reply('Esse comando só pode ser usado em canais de texto')

        const guildTestId = process.env.TEST_GUILD_ID ?? "";
        //const guildTest = await interaction.client.guilds.fetch(guildTestId);

        let emojisCreated: Array<EmojiResolvable | GuildEmoji> = [];

        switch (interaction.options.getSubcommand()) {
            case 'enviar':
                const presetName = interaction.options.getString('preset')

                const preset = await guild.settings.get('selfRolePresets')?.value as Preset[] | undefined
                if (!preset) return interaction.reply('Preset não encontrado')
                const presetData = preset.find(preset => preset.name === presetName)
                if (!presetData) return interaction.reply('Preset não encontrado')
                const messages = []
                await interaction.reply({
                    content: `Enviando...`, ephemeral: true
                })
                for (const category of presetData.categories) {
                    const options = [];
                    let row: ActionRowBuilder<StringSelectMenuBuilder> | null = null;

                    if (category.roles){
                        for (const role of category.roles) {
                            let emoji: ComponentEmojiResolvable | undefined;
                            let description: string | undefined;
    
                            if (role.emoji === 'color' && role.role.color) {
                                const colorHex = `#${role.role.color.toString(16).padStart(6, '0')}`;
                                const emojiName = colorHex.replace('#', '');
                                const createdEmoji = await createColorEmoji(interaction, emojiName, colorHex, guildTestId);
                                await sleep(100)
                                logger.debug(`Created emoji ${emojiName} with color ${colorHex}`);

                                if (createdEmoji) {
                                    emoji = createdEmoji.id ? {
                                        id: createdEmoji.id,
                                        name: createdEmoji.name ?? undefined
                                    } : undefined;
                                    emojisCreated.push(createdEmoji);
                                }
                                await interaction.editReply({
                                    content: `Enviando... (Criei ${emojisCreated.length} emojis)`
                                })
    
                            } else if (role.emoji !== 'none' && role.emoji !== 'false') emoji = role.emoji as ComponentEmojiResolvable;
    
                            if (role.description !== 'none' && role.description !== 'false') description = role.description
                            else description = undefined;

                            options.push({
                                label: role.name,
                                value: `${role.role.id}`,
                                emoji: emoji || undefined,
                                ...(description ? { description } : {})
                            });
                        }
                        logger.info(`Created ${emojisCreated.length} emojis`)
                        if (options.length > 0){
                            row = new ActionRowBuilder<StringSelectMenuBuilder>()
                            .setComponents([
                                new StringSelectMenuBuilder()
                                    .setCustomId('selfRoles-' + presetName + '-' + category.name)
                                    .setPlaceholder('Escolha uma opção')
                                    .addOptions(options)
                                    .setMaxValues(category.maxRoles === 0 ? category.roles.length : category.maxRoles)
                            ])
    
                        }

                    } 

                    messages.push({
                        embeds: [category.embed],
                        ...(row ? { components: [row.toJSON()] } : {})
                    })


                }


                for (const message of messages) {
                    await interaction.channel?.send(message)
                }
                let i = 0
                for (const emoji of emojisCreated) {
                    // console.log(`Resolved Emoji ${emoji}`)
                    if (emoji instanceof GuildEmoji) {
                        await emoji.delete('Cleanup after interaction').catch((err) => {
                            console.error(`Erro ao excluir o emoji ${emoji.name}:`, err);
                        })
                        i++
                        await interaction.editReply({
                            content: `Mensagem enviada... deletando emojis temporários ${i}/${emojisCreated.length}`
                        })

                    }
                }

                await interaction.editReply({
                    content: `Registro enviado com sucesso!`
                })
                break
        }
    },
    global: true,
    autoCompleteFunc: async ({interaction, guild}) => {
        const presets: Preset[] = guild.settings.get('selfRolePresets')?.value as Preset[] || []
        if (!presets) return interaction.respond([])
        let options
        if (presets.length < 24) {
            options = presets.map(preset => {
                return {
                    name: preset.name,
                    value: preset.name
                }
            })
        } else {
            const fuseOptions = {
                keys: ['name'],
                threshold: 1
            }
            const fuseInstance = new fuse(presets, fuseOptions)
            const results = fuseInstance.search(interaction.options.getString('preset') || 'a', {limit: 24}).map(result => result.item)
            options = results.map(result => {
                return {
                    name: result.name,
                    value: result.name
                }
            })
        }
        /*
        options.push({
            name: 'Criar um ticket personalizado',
            value: 'custom'
        })
         */
        await interaction.respond(options)
    }
})