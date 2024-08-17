import {EmbedBuilder} from "discord.js";
import pupa from "pupa";

export function mapObjectStrings<T extends Record<string, any>>(obj: T, fn: (text: string) => string): T {
    const mappedFields = Object.keys(obj)
    const rebuiltEmbed: Record<string, any> = {}
    for (const key of mappedFields) {
        if (typeof obj[key] === 'string') {
            rebuiltEmbed[key] = fn(obj[key])
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            rebuiltEmbed[key] = mapObjectStrings(obj[key], fn)
        } else {
            rebuiltEmbed[key] = obj[key]
        }
    }
    return rebuiltEmbed as T
}

export function createMapFn(data: Record<string, any>) {
    return (text: string) => {
        return pupa(text, data)
    }
}

export function populateEmbed(embed: EmbedBuilder, data: Record<string, any>) {
    return new EmbedBuilder(mapObjectStrings(embed.toJSON(), createMapFn(data)))
}

export function createSafeEmbed(embed: Record<string, any>) {
    const embedBuilder = new EmbedBuilder()
        .setTitle(embed.title)
        .setDescription(embed.description)
        .setColor(embed.color)
        .setFields(embed.fields)
        .setFooter(embed.footer)
        .setImage(embed.image?.url)
        .setThumbnail(embed.thumbnail?.url)
        .setAuthor(embed.author)
        .setTimestamp(embed.timestamp)
    return embedBuilder
}


