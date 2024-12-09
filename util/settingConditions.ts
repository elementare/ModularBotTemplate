import Guild from "../classes/structs/Guild";
import User from "../classes/structs/User";


export function botCreatorCondition(guild: Guild, user: User) {
    return user.member.id === '177840117057191937';
};