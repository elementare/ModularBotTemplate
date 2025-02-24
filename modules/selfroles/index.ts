import {Logger} from "winston";
import {BaseModuleInterfacer, ExtendedClient} from "../../types";
import {Category, DbPreset, Preset} from "./types";
import {ArraySetting} from "../../settings/DefaultTypes/arr";
import {RoleSettingFile} from "../../settings/DefaultTypes/role";
import {Setting} from "../../settings/Setting";
import ComplexSettingClass from "../../settings/DefaultTypes/complex";
import {EmbedBuilder, PermissionFlagsBits, Role} from "discord.js";
import {StringSettingFile} from "../../settings/DefaultTypes/string";
import {EmbedSettingFile} from "../../settings/DefaultTypes/embed";
import {NumberSettingFile} from "../../settings/DefaultTypes/number";

module.exports = async (client: ExtendedClient, _: any, logger: Logger): Promise<{
    interfacer: BaseModuleInterfacer,
    settings: Array<Setting<any>>
}> => {
    logger.notice(`Initializing module`);
    class Interfacer implements BaseModuleInterfacer {
        constructor(logger: Logger) {
            logger.notice(`Interfacer initialized`);
        }
        createPreset(preset: Preset, guildId: string): Promise<Preset>{
            return new Promise(async (resolve) => {
                const guild = await client.guildHandler.fetchOrCreate(guildId)
                if (!guild.data['Registro']) guild.data['Registro'] = {
                    presets: new Map<string, DbPreset>()
                }
                guild.data['Registro'].presets.set(preset.name, preset)
                guild.data.markModified('Registro')
                await guild.data.save()
                resolve(preset)
            })
        }
        deletePreset(presetName: string, guildId: string): Promise<boolean>{
            return new Promise(async (resolve) => {
                const guild = await client.guildHandler.fetchOrCreate(guildId)
                if (!guild.data['Registro']) guild.data['Registro'] = {
                    presets: new Map<string, DbPreset>()
                }
                guild.data['Registro'].presets.delete(presetName)
                guild.data.markModified('Registro')
                await guild.data.save()
                resolve(true)
            })
        }

    };
    const interfacer = new Interfacer(logger);

    const settings: Array<Setting<any>> = [
        new ArraySetting({
            id: "selfRolePresets",
            name: 'Presets de Registro',
            description: 'Configura os presets de tickets',
            overrides: {
                parseToField: (value:any) => {
                    return `Nome: ${value.name}\nCategorias: ${value.categories.length}`
                },
                embed: new EmbedBuilder()
                    .setTitle('Presets de Registro')
                    .setDescription('Um preset de registro é um conjunto de dados que representam um registro, cada preset tem um nome e uma lista de categorias que são partes individuais do registro, é necessário ter pelo menos 1 preset para poder configurar um registro')
                    .setColor('#7a41ff')
            },
            permission: PermissionFlagsBits.Administrator,
            child: new ComplexSettingClass({
                name: 'Preset de registro',
                description: 'Configura um preset de registro',
                id: 'preset',
                updateFn: (value) => {
                    const humanReadable = new Map<string, string>([
                        ['name', 'Nome'],
                        ['embed', 'Embed'],
                        ['categories', 'Categorias']
                    ])
                    const fields = []
                    for (const key in value) {

                        switch (key) {
                            case 'categories':
                                fields.push({
                                    name: humanReadable.get(key) as string,
                                    value: (value[key] as Category[]).map((category, index) => {
                                        return `Categoria ${index + 1}: ${category.name}`
                                    }).join('\n'),
                                    inline: true
                                })
                                break;
                            case 'embed':
                                fields.push({
                                    name: humanReadable.get(key) as string,
                                    value: 'Clique no botão abaixo para visualizar',
                                    inline: true
                                })
                                break;
                            default:
                                fields.push({
                                    name: humanReadable.get(key) ?? key,
                                    value: value[key] + '',
                                    inline: true
                                })
                        }
                    }
                    return new EmbedBuilder()
                        .setTitle("Configure um preset")
                        .setColor('#8959ff')
                        .setFields(fields)
                },
                schema: {
                    name: new StringSettingFile({
                        name: 'Nome',
                        description: 'Nome do preset',
                        id: 'name',
                        color: '#ab86ff',
                    }),
                    categories: new ArraySetting({
                        name: 'Categorias',
                        description: 'Categorias do preset',
                        overrides: {
                            parseToField: (value:any) => {
                                const roles = Array.isArray(value.roles) ? value.roles : [];
                                return `Nome: ${value.name}\nCargos: ${roles.map((role: Role) => role.name).join(', ')}`;

                            },
                            embed: new EmbedBuilder()
                                .setTitle('Categorias')
                                .setDescription('Categorias são partes individuais do registro, cada um é uma mensagem separada com sua propria embed e menu de seleção de cargos')
                                .setColor('#ab86ff')
                        },
                        id: 'categories',
                        child: new ComplexSettingClass({
                            name: 'Categoria',
                            description: 'Categoria do preset',
                            id: 'category',
                            updateFn: (value) => {
                                const humanReadable = new Map<string, string>([
                                    ['name', 'Nome'],
                                    ['roles', 'Cargos']
                                ])
                                const fields = []
                                for (const key in value) {
                                    let valueText = value[key];

                                    if (valueText === undefined || valueText === null) {
                                        valueText = 'Valor não definido'; // Fallback for missing values
                                    } else if (typeof valueText === 'object') {
                                        valueText = JSON.stringify(valueText); // Serialize objects to string
                                    } else {
                                        valueText = valueText.toString(); // Ensure it's a string
                                    }

                                    fields.push({   
                                        name: humanReadable.get(key) ?? key,
                                        value: valueText.length > 100 ? 'Texto muito grande para ser visualizado' : valueText,
                                        inline: true
                                    })
                                }
                                return new EmbedBuilder()
                                    .setTitle("Categoria")
                                    .setColor('#C7B1FF')
                                    .setDescription('Aqui você define as configurações da categoria')
                                    .setFields(fields)
                            },
                            optionals: ['roles', 'maxRoles'],
                            schema: {
                                name: new StringSettingFile({
                                    name: 'Nome',
                                    description: 'Nome da categoria',
                                    id: 'name',
                                    color: '#daccff',
                                }),
                                embed: new EmbedSettingFile({
                                    name: 'Embed',
                                    description: 'Embed do preset',
                                    id: 'embed',
                                    color: '#daccff',
                                }),
                                roles: new ArraySetting({
                                    name: 'Cargos',
                                    description: 'Cargos da categoria',
                                    id: 'roles',
                                    overrides: {
                                      embed: new EmbedBuilder()
                                            .setTitle('Cargos')
                                            .setDescription('Cargos são os cargos que o usuário pode selecionar ao clicar no botão, cada cargo é uma opção no menu de seleção')
                                            .setColor('#daccff')
                                    },
                                    child: new ComplexSettingClass({
                                        name: 'Cargo',
                                        description: 'Define um cargo que o usuário pode selecionar',
                                        id: 'role',
                                        updateFn: (value) => {
                                            const humanReadable = new Map<string, string>([
                                                ['name', 'Nome'],
                                                ['id', 'ID']
                                            ])
                                            const fields = []
                                            for (const key in value) {
                                                fields.push({
                                                    name: humanReadable.get(key) ?? key,
                                                    value: value[key] + '',
                                                    inline: true
                                                })
                                            }
                                            return new EmbedBuilder()
                                                .setTitle("Cargo")
                                                .setColor('#daccff')
                                                .setDescription('Lorem ipsum')
                                                .setFields(fields)
                                        },
                                        schema: {
                                            name: new StringSettingFile({
                                                name: 'Nome',
                                                description: 'Nome do cargo',
                                                id: 'name',
                                                color: '#eee8ff',
                                            }),
                                            role: new RoleSettingFile({
                                                name: 'Cargo',
                                                description: 'Cargo da categoria',
                                                id: 'role'
                                            }),
                                            emoji: new StringSettingFile({
                                                name: 'Emoji',
                                                description: 'Emoji do cargo. Deixe o valor em none para não adicionar emoji',
                                                id: 'name',
                                                color: '#eee8ff',
                                            }, 'none'),
                                            description: new StringSettingFile({
                                                name: 'Descrição',
                                                description: 'Descrição do cargo. Deixe o valor em none para não por descrição',
                                                id: 'descrição',
                                                color: '#eee8ff'
                                            }, 'none')
                                        },
                                        optionals: ["emoji", "description"]
                                    })
                                }, []),
                                maxRoles: new NumberSettingFile({
                                    name: 'Máximo de cargos',
                                    description: 'Máximo de cargos que o usuário pode ter, 0 para ilimitado (Em casos de ter uma categoria com apenas 1 cargo, é recomendado deixar em 1)',
                                    id: 'maxRoles',
                                    color: '#daccff',
                                }, 0),
                            }
                        })
                    }, [])
                }
            })
        }, [])
    ]
    /*
    settings[1].save = async (guild, presets: Preset[]) => {
        return new Promise(async (resolve) => {
            if (!guild.data['Registro']) guild.data['Registro'] = {
                presets: new Map<string, DbPreset>()
            }
            guild.data['Registro'].presets = new Map<string, DbPreset>()
            for (let i = 0; i < presets.length; i++) {
                const preset = presets[i]
                const dbReady = {
                    name: preset.name,
                    embed: preset.embed.toJSON(),
                    categories: preset.categories.map(category => {
                        return {
                            name: category.name,
                            prefix: category.prefix,
                            initialMessage: category.initialMessage,
                            emoji: category.emoji,
                            description: category.description,
                            permissions: category.permissions.map(role => role.id )
                        }
                    })
                }

                guild.data['Registro'].presets.set(dbReady.name, dbReady)
            }
            guild.data.markModified('Registro')
            await guild.data.save()
            resolve(true)
        })
    }
    settings[1].load = async (guild, guildData): Promise<Preset[]> => {
        return new Promise(async (resolve) => {
            if (!guildData['Registro']) guildData['Registro'] = {
                presets: new Map<string, DbPreset>()
            }
            const presetsMap = guildData['Registro'].presets as Map<string, DbPreset>
            const presets = Array.from(presetsMap.values())
            const parsedPresets: Preset[] = []
            for (const preset of presets) {
                const roles = await Promise.all(preset.categories.map(async category => {
                    return await Promise.all(category.permissions.map(async roleId => {
                        return await guild.roles.fetch(roleId, {cache: true})
                    }))
                }))
                const parsedPreset: Preset = {
                    name: preset.name,
                    embed: new EmbedBuilder(preset.embed),
                    categories: preset.categories.map((category, index) => {
                        return {
                            name: category.name,
                            prefix: category.prefix,
                            initialMessage: category.initialMessage,
                            emoji: category.emoji,
                            description: category.description,
                            permissions: roles[index] as Role[]
                        }
                    })
                }
                parsedPresets.push(parsedPreset)
            }
            resolve(parsedPresets)
        })
    }
     */
    return {
        interfacer: interfacer,
        settings: settings
    }
}