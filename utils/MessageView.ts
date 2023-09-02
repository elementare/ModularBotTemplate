import {ExtendedClient, MessageViewUpdate} from "../types";
import {Interaction, Message, RepliableInteraction, TextBasedChannel} from "discord.js";
import {EventEmitter} from "events";

type ExtraOptions = {
    filter: (interaction: RepliableInteraction) => boolean,
}

export function CreateView(channel: TextBasedChannel, client: ExtendedClient, view: MessageViewUpdate, options?: ExtraOptions): Promise<MessageView> {
    return new Promise(async (resolve, reject) => {
        await channel.send(view).then((msg) => {
            const viewClass = new MessageView(msg, channel, client, options?.filter)
            resolve(viewClass)
        }).catch((err) => {
            return reject(err)
        })

    })
}

// Not recommended since there exists the interaction view, but you do you
export function CreateViewFromInteraction(interaction: Interaction, client: ExtendedClient, view: MessageViewUpdate, options?: ExtraOptions): Promise<MessageView> {
    return new Promise(async (resolve, reject) => {
        if (!interaction.channel) return reject('Interaction channel not found')
        if (interaction.isRepliable()) {
            await interaction.reply({
                ...view,
                fetchReply: true
            }).then((msg) => {
                const viewClass = new MessageView(msg, interaction.channel as TextBasedChannel, client, options?.filter)
                resolve(viewClass)
            }).catch((err) => {
                return reject(err)
            })
        }
    })
}

export function CreateViewFromMessage(message: Message, client: ExtendedClient, options?: ExtraOptions): Promise<MessageView> {
    return new Promise(async (resolve) => {
        const viewClass = new MessageView(message, message.channel, client, options?.filter)
        resolve(viewClass)
    })
}


/*
* No support for ephemeral messages since they have a completely different way of updating with discord.js
* Do not use the class directly, use the CreateView function instead
* This class is used to create a view for a message, views don't need to be sent, the class handles that
* Every time there is an update the view is called and if changes are detected the message is updated
* Events: delete, any interaction component customId (Ex: Button with customId "button" will emit "button")
 */
export class MessageView extends EventEmitter {
    private readonly message: Message;
    private readonly channel: TextBasedChannel;
    private readonly client: ExtendedClient;
    private extraFilter: (interaction: RepliableInteraction) => boolean = () => true;
    constructor(message: Message, channel: TextBasedChannel, client: ExtendedClient, filter?: (interaction: RepliableInteraction) => boolean) {
        super()
        this.channel = channel
        this.client = client
        this.message = message
        if (filter) this.extraFilter = filter
        this.client.on("interactionCreate", (interaction) => {
            if ((interaction as any).message && (interaction as any).message.id === this.message.id) {
                if (this.extraFilter((interaction as RepliableInteraction))) {
                    const split = (interaction as any).customId.split("-")
                    const id = split.shift()
                    super.emit(id, interaction, split)
                    super.emit("any", interaction)
                }
            }
        })
        this.client.on("messageDelete", (deleted) => {
            super.emit("delete", deleted)
        })
    }
    public setExtraFilter(filter: (interaction: RepliableInteraction) => boolean) {
        this.extraFilter = filter
        return true
    }
    public get Channel() {
        return this.channel
    }
    public async update(view: MessageViewUpdate) {
        await this.message.edit(view).then(() => {
            return true
        }).catch(() => {
            return false
        })
    }
    public async destroy(reason?: string) {
        return true
    }

    public clone() {
        return new MessageView(this.message, this.message.channel, this.client, this.extraFilter)
    }
}