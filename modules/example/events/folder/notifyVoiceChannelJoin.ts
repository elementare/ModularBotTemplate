import { Event } from "../../../../types";

export const event: Event<'joinedVoiceChannel'> = {
    event: 'joinedVoiceChannel',
    func: (client, logger, state) => {
        if (!state.member) return;
        if (!state.channel) return;
        logger.notice(`${state.member.user.username} joined ${state.channel.name}`);
    }
}