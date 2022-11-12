import {Event} from "../../types";

export const event:Event<"guildMemberUpdate"> = {
    event: 'guildMemberUpdate',
    func: (client, logger, oldMember, newMember) => {
        if (oldMember.roles.cache.size < newMember.roles.cache.size) {
            const role = newMember.roles.cache.find(r => !oldMember.roles.cache.has(r.id));
            if (!role) return;
            client.emit('roleAdded', newMember, role);
        }
        if (oldMember.roles.cache.size > newMember.roles.cache.size) {
            const role = oldMember.roles.cache.find(r => !newMember.roles.cache.has(r.id));
            if (!role) return;
            client.emit('roleRemoved', newMember, role);
        }
        if (newMember.guild.roles.premiumSubscriberRole) {
            if (!oldMember.roles.cache.has(newMember.guild.roles.premiumSubscriberRole.id) && newMember.roles.cache.has(newMember.guild.roles.premiumSubscriberRole.id)) {
                client.emit('newBoosterMember', newMember);
            }
        }
    }
}