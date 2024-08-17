import SlashCommand from "../../classes/structs/SlashCommand";
import {
    SlashCommandBuilder,
    PermissionsBitField
} from "discord.js";
import yaml from "yaml";
import {isEndNode, Permissions} from "../../classes/structs/Permissions";
import axios from "axios";
import {parseToDatabase} from "../../util/parsingRelated";
import {PermissionOverrideTree} from "../../types";

function tryParseYAML(value: string): any {
    try {
        return yaml.parse(value);
    } catch (e) {
        return null;
    }
}


type ImportOverride = {
    id: string,
    permitir: string[], // Should be module IDs with correct namespacing
    negar: string[]     // Same as above
}


export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('permissões')
        .setDescription(`Grupo de permissões`)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setar')
                .setDescription("Seta os overrides de permissão")
                .addAttachmentOption(option =>
                    option
                        .setName('permissão')
                        .setDescription('Permissão a ser setada em YAML')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('listar')
                .setDescription("Lista os overrides de permissão")
        ),
    func: async ({interaction, logger, guild}) => {
        switch (interaction.options.getSubcommand()) {
            case 'setar': {
                const attachment = interaction.options.getAttachment('permissão');
                if (!attachment) return interaction.reply({
                    content: 'Anexo inválido',
                    ephemeral: true
                });
                if (!attachment.contentType || !attachment.contentType.includes('text/plain')) return interaction.reply({
                    content: 'Anexo inválido',
                    ephemeral: true
                });
                const attachmentData = attachment.url
                const data = await axios.get(attachmentData).then(res => res.data).catch(() => null)
                if (typeof data !== 'string') return interaction.reply({
                    content: 'Anexo inválido',
                    ephemeral: true
                });

                const permission = tryParseYAML(data) as {
                    overrides: ImportOverride[]
                }
                if (!permission || !permission.overrides || !(permission.overrides instanceof Array)) return interaction.reply({
                    content: 'Permissão inválida',
                    ephemeral: true
                });
                let logs = [] as string[];
                const translatedOverrides = new Permissions(logger, new Map())
                for (const override of permission.overrides) {
                    if (!override.negar && !override.permitir) {
                        logs.push(`Permissão base inválida para ${override.id}`)
                        continue;
                    }
                    if (!(override.negar instanceof Array) || !(override.permitir instanceof Array)) {
                        logs.push(`Permissão inválida para ${override.id}`)
                        continue;
                    }
                    for (const module of override.negar) {
                        const data = translatedOverrides.getEndNode(module)
                        if (!data) translatedOverrides.set(module, {
                            allow: [],
                            deny: [
                                override.id
                            ]
                        })
                        else {
                            data.deny.push(override.id)
                            translatedOverrides.set(module, data)
                        }
                    }
                    for (const module of override.permitir) {
                        const data = translatedOverrides.getEndNode(module)
                        if (!data) translatedOverrides.set(module, {
                            allow: [
                                override.id
                            ],
                            deny: []
                        })
                        else {
                            data.allow.push(override.id)
                            translatedOverrides.set(module, data)
                        }
                    }
                }
                if (logs.length > 0) return interaction.reply({
                    content: logs.join('\n'),
                    ephemeral: true
                });
                guild.data.permissionsOverrides = parseToDatabase(translatedOverrides.permissions)
                guild.data.markModified('permissionOverrides');
                await guild.data.save();
                guild.permissionOverrides = translatedOverrides;
                await interaction.reply({
                    content: 'Permissões atualizadas com sucesso',
                    ephemeral: true
                });
            }
                break;
            case 'listar': {
                const translatedOverrides = {
                    overrides: [] as ImportOverride[]
                }
                function recurseThroughTree(permissions: PermissionOverrideTree = guild.permissionOverrides.permissions, path: string = '') {
                    for (const [branch, value] of permissions) {
                        if (isEndNode(value)) {
                            for (const allow of value.allow) {
                                const existing = translatedOverrides.overrides.find(override => override.id === allow)
                                if (!existing) {
                                    translatedOverrides.overrides.push({
                                        id: allow,
                                        permitir: [
                                            path ? `${path}.${branch}` : branch
                                        ],
                                        negar: []
                                    })
                                } else {
                                    if (!existing.permitir.includes(path ? `${path}.${branch}` : branch)) {
                                        existing.permitir.push(path ? `${path}.${branch}` : branch)
                                    }
                                }
                            }
                            for (const deny of value.deny) {
                                const existing = translatedOverrides.overrides.find(override => override.id === deny)
                                if (!existing) {
                                    translatedOverrides.overrides.push({
                                        id: deny,
                                        permitir: [],
                                        negar: [
                                            path ? `${path}.${branch}` : branch
                                        ]
                                    })
                                } else {
                                    if (!existing.negar.includes(path ? `${path}.${branch}` : branch)) {
                                        existing.negar.push(path ? `${path}.${branch}` : branch)
                                    }
                                }
                            }
                        } else {
                            recurseThroughTree(value, path ? `${path}.${branch}` : branch)
                        }
                    }
                }
                recurseThroughTree();
                const file = Buffer.from(yaml.stringify(translatedOverrides))
                await interaction.reply({
                    files: [{
                        attachment: file,
                        name: 'overrides.yaml'
                    }],
                    ephemeral: true
                })
            }
                break;
            /*
            case 'avaliar': {
                const role = interaction.options.getRole('cargo');
                if (!role) return interaction.reply({
                    content: 'Cargo inválido',
                    ephemeral: true
                });
                const permissionOverrides = guild.permissionOverrides.filter(override => override.allow.roles.includes(role.id) || override.disallow.roles.includes(role.id));
                const rolePerms = role.permissions as PermissionsBitField;
                const slashPermissions = client.commands.slash.filter(command => {
                    const definedData = command.data.toJSON()
                    const permissionRequired = definedData.default_member_permissions ?? definedData.default_permission
                    if (!permissionRequired) return true;
                    return rolePerms.has(BigInt(permissionRequired))
                })
                const textPermissions = client.commands.text.filter((command, key) => {
                    if (command.aliases.includes(key)) return false; // Ignore aliases
                    const definedData = command.permissions
                    if (!definedData) return true;
                    return definedData.some(permission => rolePerms.has(permission))
                })
                const embed = new EmbedBuilder()
                    .setTitle('Permissões do cargo')
                    .setColor("#f5c6a1")
                    .setDescription(`Overrides: ${permissionOverrides.map(override => {
                        return `**${override.id}**\nPermitir: ${override.allow.roles.includes(role.id) ? 'Sim' : 'Não'}\nNegar: ${override.disallow.roles.includes(role.id) ? 'Sim' : 'Não'}`
                    }).join('\n\n') || "Sem overrides de permissão"}\n\nPermissões de slash: ${slashPermissions.map(command => command.data.name).join(', ')}\n\nPermissões de texto: ${textPermissions.map(command => command.name).join(', ')}`)
                await interaction.reply({
                    embeds: [embed]
                });
            }
             */
        }
    },
    global: true
})