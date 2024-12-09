import Guild from "../classes/structs/Guild";
import {GuildMember, PermissionResolvable, TextChannel} from "discord.js";
import User from "../classes/structs/User";


export async function permissionCompute(node: string, guild: Guild, member: GuildMember, channel: TextChannel, basePermission?: PermissionResolvable): Promise<boolean> {
    if (basePermission && member.permissions.has(basePermission)) return true;
    const allowBypassOverride = guild.permissionOverrides.getEndNode(node)
    if (!allowBypassOverride) return false;
    return await guild.client.permissionHandler.computePermissions(allowBypassOverride, member, channel) === true;
}

export async function permissionComputeProfile(node: string, user: User, channel: TextChannel, basePermission?: PermissionResolvable): Promise<boolean> {
    const member = user.member
    const guild = user.guild
    if (basePermission && member.permissions.has(basePermission)) return true;
    const allowBypassOverride = guild.permissionOverrides.getEndNode(node)
    if (!allowBypassOverride) return false;
    return await guild.client.permissionHandler.computePermissions(allowBypassOverride, member, channel) === true;
}
