import SlashCommand from "../../../../classes/structs/SlashCommand";
import {SlashCommandBuilder} from "discord.js";


export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setDefaultMemberPermissions(8)
        .setName('comer')
        .setDescription('Comer alguém'),
    func: async ({logger, interaction}) => {
        logger.notice(`Comer command executed`);
        await interaction.reply('Comer command executed');
    },
    global: true
})