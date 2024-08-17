// noinspection JSUnusedGlobalSymbols

import {EventEmitter} from "events";
import {Logger} from "winston";
import {AnyView, MessageViewUpdate} from "../types";
import snowflakify from "snowflakify";
import {ActionRowBuilder} from "discord.js";
type Page = {
    style: MessageViewUpdate,
    id: string
}

function forwardEvents(forwarder: EventEmitter, forwarded: EventEmitter) {
    const forwarderEmit = forwarder.emit;

    forwarder.emit = function (eventName: string | symbol, ...args: any[]) {
        const fnArgs = [eventName, ...args] as [string | symbol, ...any[]];
        forwarded.emit.apply(forwarded, fnArgs);
        forwarderEmit.apply(forwarder, fnArgs);
        return true
    }
}

export class ViewRouter extends EventEmitter {
    private logger: Logger;
    public stack: Page[] = [];
    private readonly snowflaker: snowflakify;
    public view: AnyView;
    private forcedRows: ActionRowBuilder[] = [];
    constructor(logger: Logger, view: AnyView) {
        super();
        this.logger = logger.child({
            service: 'ViewRouter',
            hexColor: '#a5ecec'
        })
        this.snowflaker = new snowflakify();
        this.view = view;
        forwardEvents(view, this);
        view.on("returnPage", async () => {
            await this.pop();
        })
    }
    public setView(view: AnyView) {
        this.view = view;
    }
    public setRows(rows: ActionRowBuilder[]) {
        this.forcedRows = rows;
    }
    public async push(update: MessageViewUpdate) {
        const id = this.snowflaker.nextHexId();
        this.stack.push({style: update, id});
        this.view.setId(id);
        if (update.components) {
            update.components = [...update.components, ...this.forcedRows as any];
        } else {
            update.components = this.forcedRows as any;
        }
        await this.view.update(update);
        return id;
    }
    public async pop() {
        const page = this.stack.pop();
        if (!page) return;
        this.view.setId(page.id);
        await this.view.update(page.style);
        return page.id;
    }

    public clearStack() {
        this.stack = [];
    }


    public async update(update: MessageViewUpdate) {
        return this.view.update(update);
    }
    public async destroy() {
        this.view.destroy();
    }
}