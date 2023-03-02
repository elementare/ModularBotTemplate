import {
    ButtonOption,
    ExtendedClient,
    GenericOption,
    GenericPrimitiveOption,
    ListOption, Manifest,
    ObjectOption,
    SelectOption
} from "../types";
import {Logger} from "winston";

export default async (client: ExtendedClient, settings: Array<Partial<GenericOption>>, logger: Logger, partialManifest: Partial<Manifest>, folder: string) => {
    const parsedSettings: Array<GenericOption> = []

    for (const setting of settings) {
        logger.info(`Loading setting ${setting.name}`);
        if (!setting.id) {
            logger.crit('No id provided for setting ' + setting.name)
            throw new Error('No id provided')
        }
        if (!setting.name) {
            logger.crit('No name provided for setting ' + setting.id)
            throw new Error('No name provided')
        }
        if (!setting.description) {
            logger.crit('No description provided for setting ' + setting.id)
            throw new Error('No description provided')
        }
        const functions = partialManifest.configUpdateFile ? await import(`../modules/${folder}/${partialManifest.configUpdateFile}`) : undefined;
        if (!functions) {
            await logger.warning(`Settings found in manifest.json in ${folder} but its invalid or doenst exist`);
        }
        setting.updateFunction = Array.from(Object.keys(functions)).includes(setting.name) ? functions[setting.name] : undefined
        switch (setting.type) {
            case 'text':
            case 'number':
            case 'boolean':
            case 'role':
            case 'channel':
            case 'user': // Generic types
                const GenericSetting = setting as GenericPrimitiveOption<typeof setting.type>
                parsedSettings.push(GenericSetting)
                break
            case 'button':

                if (!setting.default) setting.default = false
                const ButtonSetting = setting as ButtonOption
                parsedSettings.push(ButtonSetting)
                break;
            case 'select':

                const SelectSetting = setting as SelectOption
                if (SelectSetting.max === 0) SelectSetting.max = SelectSetting.options.length
                if (SelectSetting.max > SelectSetting.options.length) {
                    logger.warning('MultiSelect is higher than the amount of options for setting ' + setting.id)
                    logger.warning('Will set MultiSelect to 0 (all)')
                    SelectSetting.max = 0
                }
                if (SelectSetting.max < 0) {
                    logger.warning('MultiSelect is lower than 0 for setting ' + setting.id)
                    logger.warning('Will set MultiSelect to 0 (all)')
                    SelectSetting.max = SelectSetting.options.length
                }
                if (SelectSetting.min > SelectSetting.options.length) {
                    logger.warning('MinSelect is higher than the amount of options for setting ' + setting.id)
                    logger.warning('Will set MinSelect to 0')
                    SelectSetting.min = SelectSetting.options.length
                }
                if (SelectSetting.min <= 0) {
                    logger.warning('MinSelect is lower than 0 for setting ' + setting.id)
                    logger.warning('Will set MinSelect to 1')
                    SelectSetting.min = 1
                }
                if (SelectSetting.min > SelectSetting.max) {
                    logger.warning('MinSelect is higher than the MultiSelect amount for setting ' + setting.id)
                    logger.warning('Will set MinSelect to MultiSelect amount')
                    SelectSetting.min = SelectSetting.max
                }
                if (!SelectSetting.options) {
                    logger.crit('No options provided for select setting ' + setting.id)
                    throw new Error('No options provided')
                }
                if (SelectSetting.default && SelectSetting.default.length > SelectSetting.options.length) {
                    logger.warning('Default length is higher than the amount of options available for setting ' + setting.id)
                    logger.warning('Will remove any defaults over the amount of options')
                    SelectSetting.default = SelectSetting.default.slice(0, SelectSetting.options.length)
                }
                if (SelectSetting.default && SelectSetting.default.length > SelectSetting.max && SelectSetting.max !== 0) {
                    logger.warning('Default length is higher than the multiSelect amount ' + setting.id)
                    logger.warning('Will remove any defaults over the multiSelect amount')
                    SelectSetting.default = SelectSetting.default.slice(0, SelectSetting.max)
                }
                parsedSettings.push(SelectSetting)
                break;
            case 'list':
                if (!setting.structure) {
                    logger.crit('No structure provided for list setting ' + setting.id)
                    throw new Error('No structure provided')
                }
                if (setting.default && setting.default.length > setting.structure.length) {
                    logger.warning('Default length is higher than the amount of options available for setting ' + setting.id)
                    logger.warning('Will remove any defaults over the amount of options')
                    setting.default = setting.default.slice(0, setting.structure.length)
                }
                const ListSetting = setting as ListOption
                parsedSettings.push(ListSetting)
                break;
            case 'object':
                if (!setting.structure) {
                    logger.crit('No structure provided for object setting ' + setting.id)
                    throw new Error('No structure provided')
                }
                if (setting.default && setting.default.length > setting.structure.length) {
                    logger.warning('Default length is higher than the amount of options available for setting ' + setting.id)
                    logger.warning('Will remove any defaults over the amount of options')
                    setting.default = setting.default.slice(0, setting.structure.length)
                }
                const ObjectSetting = setting as ObjectOption
                parsedSettings.push(ObjectSetting)
                break;
            default:
                if (!setting.type) {
                    logger.crit('No type provided for setting ' + settings[0].id)
                    throw new Error('No type provided')
                }
                const _unreachable: never = setting.type;
                break;
        }
    }
    return parsedSettings
}