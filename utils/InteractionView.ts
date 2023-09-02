import {ExtendedClient, MessageViewUpdate} from "../types";
import {
    ActionRowBuilder,
    AnyComponentBuilder,
    ButtonBuilder, CacheType,
    Message,
    RepliableInteraction,
    TextBasedChannel
} from "discord.js";
import {EventEmitter} from "events";
import {Awaitable} from "@discordjs/util";

type ExtraOptions =  {
    ephemeral?: boolean,
    filter?: (interaction: RepliableInteraction) => boolean
    timeout?: number
}


function genRandomHexId(): string {
    return Math.floor(Math.random() * 16777215).toString(16);
}
function addRandomIdToButtons(rows: ActionRowBuilder[], id: string): any {
    return rows.map((row) => {
        row.setComponents(row.components.map((component) => {
            const customId = (component.toJSON() as any).custom_id
            const split = customId.split("-")
            const viewId = split.pop()
            if (viewId === id) return component
            component.setCustomId( customId + '-' + id)
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
    private timeout: NodeJS.Timeout | null = null
    private readonly interactionListener: (interaction: RepliableInteraction<CacheType>) => Awaitable<void>
    private readonly messageDeleteListener: (message: Message) => Awaitable<void>
    constructor(interaction: RepliableInteraction, channel: TextBasedChannel, client: ExtendedClient, extendedOptions?: ExtraOptions) {
        super()
        this.channel = channel
        this.client = client
        this.interaction = interaction
        if (extendedOptions?.ephemeral) this.options = extendedOptions
        if (extendedOptions?.filter) this.extraFilter = extendedOptions.filter
        if (extendedOptions?.timeout !== 0) this.setTimeout(extendedOptions?.timeout || 60000)
        this.interactionListener = (interaction) => {
            if ((interaction as any).message && (interaction as any).message.id === this.msgId) {
                const split = (interaction as any).customId.split("-")
                const id = split.shift()
                console.log(`interaction, id:${id}, currentViewId:${this.viewId},event:${(interaction as any).customId}`)
                if (this.extraFilter((interaction as RepliableInteraction))) {
                    if (this.timeout) this.timeout.refresh()

                    const viewId = split.pop()
                    if (viewId !== this.viewId) return // This ensures that clones views don't emit events in the original view
                    super.emit(id, interaction, split)
                    super.emit("any", interaction)
                }
            }
        }
        this.messageDeleteListener = (deleted) => {
            if (deleted.id === this.msgId) {
                this.destroy("deleted")
                super.emit("delete", deleted)
            }
        }
        this.client.on("interactionCreate", this.interactionListener as any)
        this.client.on("messageDelete", this.messageDeleteListener as any)

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
    public setTimeout(ms: number) {
        if (this.timeout) clearTimeout(this.timeout)
        this.timeout = setTimeout(() => { this.destroy('time')}, ms)
        return this.timeout
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

    public destroy(reason?: string) {
        if (this.timeout) clearTimeout(this.timeout)
        super.emit("end", reason || "destroy")
        console.log("destroyed-" + this.viewId + "-" + reason)
        this.removeAllListeners()
        this.client.removeListener("interactionCreate", this.interactionListener as any)
        this.client.removeListener("messageDelete", this.messageDeleteListener as any)
    }
}