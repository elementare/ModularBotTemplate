import Command from "../../../../classes/structs/Command";
import {CreateViewFromMessage} from "../../../../utils/MessageView";
import {EmbedCreator} from "../../../../utils/EmbedCreatorComponent";

export default new Command({
    name: 'embed',
    aliases: [],
    description: 'Criar uma embed usando o editor de embeds',
    howToUse: 'embed',
    func: async ({ message, args, client}) => {
        if (!message.member) return message.reply('This command can only be used in a guild');
        const msg = await message.reply({
            content: 'Carregando...',
        })
        const view = await CreateViewFromMessage(msg, client)
        view.setExtraFilter((interaction) => interaction.user.id === message.author.id)
        await EmbedCreator(view, (m) => m.author.id === message.author.id, {
            shouldComplete: false,
        })

    }
})