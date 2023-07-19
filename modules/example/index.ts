import {Client, PermissionsBitField} from "discord.js";
import {Logger} from "winston";
import {BaseModuleInterfacer, ConfigOption, SettingStructure} from "../../types";


module.exports = async (client: Client, logger: Logger): Promise<{
    interfacer: BaseModuleInterfacer,
    settings: Array<ConfigOption>
}> => {
    logger.notice(`Initializing module`);
    const interfacer = new class Interfacer implements BaseModuleInterfacer {
        constructor(logger: Logger) {
            logger.notice(`Interfacer initialized`);
        }

    }(logger);
    const settings: Array<SettingStructure> = [
        {
            name: 'cu',
            description: 'Example setting',
            type: 'string',
            permission: PermissionsBitField.Flags.Administrator
        },
        {
            name: 'cu2',
            description: 'Example setting 2',
            type: 'number',
            permission: PermissionsBitField.Flags.Administrator
        },
        {
            name: 'cu3',
            description: 'Example setting 3',
            type: "complex",
            embed: {
                title: 'Example embed',
                description: 'Example embed description',
                color: '#ff0000',
            },
            permission: PermissionsBitField.Flags.Administrator,
            schema: {
                cu: {
                    name: 'cu',
                    type: 'string',
                    description: 'Example setting 3',
                },
                cu2: {
                    name: 'cu2',
                    type: 'number',
                    description: 'Example setting 3'
                },
                cu3: {
                    name: 'cu3',
                    description: 'Example setting 3',
                    type: 'complex',
                    embed: {
                        title: 'Example embed',
                        description: 'Example embed description',
                        color: '#ff0000',
                    },
                    schema: {
                        cu: {
                            name: 'cu',
                            type: 'string',
                            description: 'Example setting 3',
                        }
                    }
                }
            }
        }
    ]
    return {
        interfacer: interfacer,
        settings: settings
    }
}