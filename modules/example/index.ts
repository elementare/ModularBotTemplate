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
            name: 'aaaaaaaaaaaaaaaaaaa',
            description: 'Example setting 3',
            type: "complex-arr",
            embed: {
                title: 'Example embed',
                description: 'Example embed description',
                color: '#ff0000',
            },
            permission: PermissionsBitField.Flags.Administrator,
            schema: {
                cu: {
                    name: 'cu',
                    type: 'role',
                    description: 'Example setting 3',
                    metadata: {
                        placeholder: "Cu"
                    }
                },
                cu2: {
                    name: 'cu2',
                    type: 'channel',
                    description: 'Example setting 3',

                }
            },
            metadata: {
                parseToField: () => {
                    return "a"
                }
            }
        },
    ]
    return {
        interfacer: interfacer,
        settings: settings
    }
}