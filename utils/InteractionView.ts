import {ExtendedClient, MessageViewUpdate} from "../types";
import {
    ActionRowBuilder,
    AnyComponentBuilder,
    ButtonBuilder,
    Message,
    RepliableInteraction,
    TextBasedChannel
} from "discord.js";
import {EventEmitter} from "events";

type ExtraOptions =  {
    ephemeral?: boolean,
    filter?: (interaction: RepliableInteraction) => boolean
}


function genRandomHexId(): string {
    return Math.floor(Math.random() * 16777215).toString(16);
}
function addRandomIdToButtons(rows: ActionRowBuilder[], id: string): any {
    return rows.map((row) => {
        row.setComponents(row.components.map((component) => {
            component.setCustomId((component.toJSON() as any).custom_id + '-' + id)
            return component
        }))
        return row
    })
}

/*
* This class is a clone of MessageView but for interactions, it has support natively for ephemeral messages and supports being passed around without the need of a message
* Do not use the class directly, use the CreateView function instead
* This class is used to create a view for a message, views don't need to be sent, the class handles that
* Every time there is an update the view is called and if changes are detected the message is updated
* Events: delete, any interaction component customId (Ex: Button with customId "button" will emit "button")
 */
export class InteractionView extends EventEmitter {
    public readonly interaction: RepliableInteraction;
    private readonly channel: TextBasedChannel;
    private readonly client: ExtendedClient;
    private extraFilter: (interaction: RepliableInteraction) => boolean = () => true;
    private msgId: string = "0";
    private options: {ephemeral?: boolean} = {ephemeral: false}
    private viewId: string = genRandomHexId()
    constructor(interaction: RepliableInteraction, channel: TextBasedChannel, client: ExtendedClient, extendedOptions?: ExtraOptions) {
        super()
        this.channel = channel
        this.client = client
        this.interaction = interaction
        if (extendedOptions?.ephemeral) this.options = extendedOptions
        if (extendedOptions?.filter) this.extraFilter = extendedOptions.filter
        this.client.on("interactionCreate", (interaction) => {
            if ((interaction as any).message && (interaction as any).message.id === this.msgId) {
                if (this.extraFilter((interaction as RepliableInteraction))) {
                    const split = (interaction as any).customId.split("-")
                    const id = split.shift()
                    const viewId = split.pop()
                    if (viewId !== this.viewId) return // This ensures that clones views don't emit events in the original view
                    super.emit(id, interaction, split)
                    super.emit("any", interaction)
                }
            }
        })
        this.client.on("messageDelete", (deleted) => {
            super.emit("delete", deleted)
        })
    }
    public get Channel() {
        return this.channel
    }
    public get Interaction() {
        return this.interaction
    }
    public get Id() {
        return this.msgId
    }
    public setMsgId(id: string) {
        this.msgId = id
        return true
    }
    public setExtraFilter(filter: (interaction: RepliableInteraction) => boolean) {
        this.extraFilter = filter
        return true
    }
    public async update(view: MessageViewUpdate): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            if (view.components) view.components = addRandomIdToButtons(view.components as ActionRowBuilder[], this.viewId)
            if (this.interaction.replied) {
                await this.interaction.editReply(view).then(() => {
                    return resolve(true)
                }).catch((er) => {
                    console.log(er)
                    return resolve(false)
                })
            } else {
                console.log("Not replied")
                await this.interaction.reply({
                    ...view,
                    fetchReply: true,
                    ephemeral: this.options.ephemeral
                }).then((msg) => {
                    this.msgId = msg.id
                    return resolve(true)
                }).catch(() => {
                    return resolve(false)
                })
            }
        })
    }
    public clone() {
        const cloned = new InteractionView(this.interaction, this.channel, this.client, {ephemeral: this.options.ephemeral, filter: this.extraFilter})
        cloned.setMsgId(this.msgId)
        return cloned
    }
    public destroy() {
        this.removeAllListeners()
    }
}