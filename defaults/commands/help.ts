import Command from "../../classes/structs/Command";


export default new Command({
    name: 'help',
    aliases: ['ajuda'],
    description: 'Mostra todos os comandos disponíveis',
    howToUse: 'help',
    func: async ({logger, message}) => {
        logger.notice(`Help command executed`);
        await message.reply('Help command executed');
    }
})