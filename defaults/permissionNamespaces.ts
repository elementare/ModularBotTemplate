import {ExtendedClient} from "../types";
import {GuildMember, TextChannel} from "discord.js";


export function RolesNamespace(client: ExtendedClient, node: string, member: GuildMember, channel: TextChannel) {
    const broken = node.split('.')
    const roleId = broken.pop()
    if (!roleId) return false
    return member.roles.cache.has(roleId)
}

export function ChannelsNamespace(client: ExtendedClient, node: string, member: GuildMember, channel: TextChannel) {
    const broken = node.split('.')
    const channelId = broken.pop()
    if (!channelId) return false
    return channel.id === channelId
}

export function UsersNamespace(client: ExtendedClient, node: string, member: GuildMember, channel: TextChannel) {
    const broken = node.split('.')
    const userId = broken.pop()
    if (!userId) return false
    return member.id === userId
}