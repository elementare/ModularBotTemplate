import {Event} from "../../types";
import {GuildMember} from "discord.js";

export const event:Event = {
    event: 'guildMemberUpdate',
    func: (client, logger, oldMember: GuildMember, newMember: GuildMember) => {
        if (oldMember.roles.cache.size < newMember.roles.cache.size) {
            const role = newMember.roles.cache.find(r => !oldMember.roles.cache.has(r.id));
            client.emit('roleAdded', newMember, role);
        }
        if (oldMember.roles.cache.size > newMember.roles.cache.size) {
            const role = oldMember.roles.cache.find(r => !newMember.roles.cache.has(r.id));
            client.emit('roleRemoved', newMember, role);
        }
        if (newMember.guild.roles.premiumSubscriberRole) {
            if (!oldMember.roles.cache.has(newMember.guild.roles.premiumSubscriberRole.id) && newMember.roles.cache.has(newMember.guild.roles.premiumSubscriberRole.id)) {
                client.emit('newBoosterMember', newMember);
            }
        }
    }
}