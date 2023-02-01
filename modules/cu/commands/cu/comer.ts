import {Command, Module} from "../../../../types";

export const command: Command = {
    name: 'comer',
    aliases: [],
    description: 'Comer alguém',
    howToUse: 'comer',
    func: async ({logger, message, client}) => {
        logger.notice(`Comer command executed`);
        await message.reply('Comer command executed');
        const module = client.modules.get('penis') as Module
        const interfacer = module.interfacer
        const cu = await interfacer.cu('SDHASDKJASHDJKSHADJK')
        logger.notice(`cu: ${cu}`);
    }
}