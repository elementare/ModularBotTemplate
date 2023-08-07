import Command from "../../../../classes/structs/Command";
import {inspect} from "util";

export default new Command({
    name: 'eval',
    aliases: [],
    description: 'evaluate a expression',
    howToUse: 'eval <code>',
    func: async ({ message, args, client}) => {
        if (!message.member) return message.reply('This command can only be used in a guild');
        let code = args.join(" ").replace(/```(js)?/g, '')
        if (!code) return message.reply('Please Provide Some Code to Evaluate!');
        const user = await client.profileHandler.fetch(message.member.id, message.guild!.id)
        code = "(async () => {" + code + "})()"
        try {
            const waitFn = (ev: string) => {
                return new Promise(async (resolve) => {
                    const a = new Function('resolve', 'client', 'message', 'user', ev)
                    a(resolve, client, message, user)
                });

            };
            console.log(code)
            const result = await waitFn(code);
            let output = result;
            if (typeof result !== 'string') {
                output = inspect(result);
            }
            output = '```js\n' + output + '\n```';
            await message.reply({content: output + ''});
        } catch (error) {
            console.log(error)
            message.channel.send({content: ':x: Aconteceu algum erro'}); // returns message if error
        }
    }
})