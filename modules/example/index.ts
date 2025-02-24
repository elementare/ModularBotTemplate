import {Client, EmbedBuilder, PermissionsBitField} from "discord.js";
import {Logger} from "winston";
import {BaseModuleInterfacer} from "../../types";
import {Setting} from "../../settings/Setting";
import {StringSettingFile} from "../../settings/DefaultTypes/string";
import ComplexSettingClass from "../../settings/DefaultTypes/complex";
import {NumberSettingFile} from "../../settings/DefaultTypes/number";
import {ArraySetting} from "../../settings/DefaultTypes/arr";
import {ChannelSettingFile} from "../../settings/DefaultTypes/channel";


module.exports = async (client: Client, _:any, logger: Logger): Promise<{
    interfacer: BaseModuleInterfacer,
    settings: Array<Setting<any>>
}> => {
    logger.notice(`Initializing module`);
    const interfacer = new class Interfacer implements BaseModuleInterfacer {
        constructor(logger: Logger) {
            logger.notice(`Interfacer initialized`);
        }
        
    }(logger);
    const settings: Array<Setting<any>> = [
        new StringSettingFile({
            name: 'Teste',
            description: 'Teste',
            permission: PermissionsBitField.Flags.Administrator,
            id: 'teste'
        }),
        new ComplexSettingClass({
            name: 'Teste 2',
            description: 'Teste',
            permission: PermissionsBitField.Flags.Administrator,
            id: 'teste2',
            schema: {
                teste: new StringSettingFile({
                    name: 'Teste',
                    description: 'Teste',
                    id: 'teste2.teste'
                }),
                teste2: new NumberSettingFile({
                    name: 'Teste 2',
                    description: 'Teste',
                    id: 'teste2.teste2'
                })
            },
            updateFn: value => {
                return new EmbedBuilder()
            }
        }),
        new ArraySetting({
            name: 'Teste 3 Array simples',
            description: 'Teste',
            id: 'teste3',
            permission: PermissionsBitField.Flags.Administrator,
            child: new StringSettingFile({
                name: 'Teste',
                description: 'Teste',
                id: 'teste33'
            })
        }),
        new ArraySetting({
            name: 'Teste 4 Array complexo',
            description: 'Teste',
            permission: PermissionsBitField.Flags.Administrator,
            id: 'teste4',
            child: new ComplexSettingClass({
                name: 'Teste 4',
                description: 'Teste',
                permission: PermissionsBitField.Flags.Administrator,
                id: 'teste44',
                schema: {
                    teste: new StringSettingFile({
                        name: 'Teste',
                        description: 'Teste',
                        id: 'teste4.teste'
                    }),
                    teste2: new NumberSettingFile({
                        name: 'Teste 2',
                        description: 'Teste',
                        id: 'teste4.teste2'
                    })
                },
                updateFn: value => {
                    return new EmbedBuilder()
                }
            })
        }),
        new ArraySetting({
            name: 'Teste 5 Array simples',
            description: 'Teste',
            id: 'teste5',
            permission: PermissionsBitField.Flags.Administrator,
            child: new ChannelSettingFile({
                name: 'Teste',
                description: 'Teste',
                id: 'teste335'
            })
        })
    ]
    return {
        interfacer: interfacer,
        settings: settings
    }
}