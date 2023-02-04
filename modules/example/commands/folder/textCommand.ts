import Command from "../../../../classes/structs/Command";

export default new Command({
    name: 'comer',
    aliases: [],
    description: 'Comer alguém',
    howToUse: 'comer',
    func: async ({logger, message}) => {
        logger.notice(`Comer command executed`);
        await message.reply('Comer command executed');
    }
})