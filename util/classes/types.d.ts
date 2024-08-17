import {
    ActionRowBuilder,
    ButtonInteraction,
    EmbedBuilder,
    Message
} from "discord.js";
import {EventEmitter} from "events";


export class a extends EventEmitter {
    on<S extends string | symbol>(
        event: Exclude<S, keyof Events>,
        listener: (interaction: ButtonInteraction, ...args: any[]) => void | Promise<void>,
    ): this;
    on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void | Promise<void>): this
}

export interface Events {
    end: [
        reason: string
    ]
}