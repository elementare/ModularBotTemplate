import {APIEmbed, EmbedBuilder, Role} from "discord.js";

export type DbCategory = {
    name: string,
    prefix: string,
    description?: string,
    emoji?: string,
    id: string
    initialMessage: string,
    permissions: Array<string>
}

export type Preset = {
    name: string,
    categories: Array<Category>
}
export type Category = {
    name: string,
    embed: EmbedBuilder,
    roles: Array<{
        name: string,
        role: Role,
        emoji?: string,
        description?: string,
    }>,
    maxRoles: number
}

export type DbPreset = {
    name: string;
    embed: APIEmbed;
    categories: DbCategory[];
}

export type AllowedUser = {
    id: string,
    name: string
}
