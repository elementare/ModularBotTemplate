import {Client, Interaction, VoiceState} from "discord.js";
import {Logger} from "winston";
import { Event} from "../../../../types";

export const event: Event = {
    event: 'joinedVoiceChannel',
    func: (client: Client, logger: Logger, state: VoiceState) => {
        if (!state.member) return;
        if (!state.channel) return;
        logger.notice(`${state.member.user.username} joined ${state.channel.name}`);
    }
}