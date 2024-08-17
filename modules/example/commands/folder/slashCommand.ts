import SlashCommand from "../../../../classes/structs/SlashCommand";
import {SlashCommandBuilder} from "discord.js";


export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setDefaultMemberPermissions(8)
        .setName('teste')
        .setDescription('Lorem Ipsum'),
    func: async ({logger, interaction}) => {
        logger.notice(`aa`);
        await interaction.reply('aaaa');
    },
    global: true
})