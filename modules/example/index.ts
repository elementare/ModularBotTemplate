import {Client, EmbedBuilder, PermissionsBitField} from "discord.js";
import {Logger} from "winston";
import {BaseModuleInterfacer, ConfigOption, SettingStructure} from "../../types";
import {Setting} from "../../settings/Setting";
import {StringSettingFile} from "../../settings/DefaultTypes/string";
import ComplexSettingClass from "../../settings/DefaultTypes/complex";
import {NumberSettingFile} from "../../settings/DefaultTypes/number";


module.exports = async (client: Client, logger: Logger): Promise<{
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
            permission: PermissionsBitField.Flags.Administrator
        }),
        new ComplexSettingClass({
            name: 'Teste 2',
            description: 'Teste',
            permission: PermissionsBitField.Flags.Administrator,
            schema: {
                teste: new StringSettingFile({
                    name: 'Teste',
                    description: 'Teste'
                }),
                teste2: new NumberSettingFile({
                    name: 'Teste 2',
                    description: 'Teste'
                })
            },
            embed: new EmbedBuilder()
                .setTitle('Teste')
                .setDescription('Teste')
        })
    ]
    return {
        interfacer: interfacer,
        settings: settings
    }
}