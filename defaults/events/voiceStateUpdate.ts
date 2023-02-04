import { Event } from "../../types";
import {VoiceState} from "discord.js";

export const event: Event = {
    event: 'voiceStateUpdate',
    func: (client, logger, oldState:VoiceState, newState: VoiceState) => {
        if (!oldState.channelId && newState.channelId) {
            client.emit('joinedVoiceChannel', newState);
        }
        if (oldState.channelId && !newState.channelId) {
            client.emit('leftVoiceChannel', oldState);
        }
        if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            client.emit('movedVoiceChannel', oldState, newState);
            client.emit('leftVoiceChannel', oldState);
            client.emit('joinedVoiceChannel', newState);
        }
    }
}