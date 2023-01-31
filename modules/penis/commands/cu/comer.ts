import {Command} from "../../../../types";

export const command: Command = {
    name: 'comer',
    aliases: [],
    description: 'Comer alguém',
    howToUse: 'comer',
    func: async ({logger, message}) => {
        logger.notice(`Comer command executed`);
        await message.reply('Comer command executed');
    }
}