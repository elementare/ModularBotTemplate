import {InteractionView} from "../../utils/InteractionView";
import {ExtendedClient, SavedSetting, typeFile} from "../../types";
import Guild from "./Guild";

type ConstructorArgs = {
    name: string,
    value: any,
    permission: bigint,
    save?: (client: ExtendedClient, data: any) => Promise<boolean>,
    description: string;
    parse?: (client: ExtendedClient, data: any) => any;
    guild: Guild;
}
export abstract class Setting {
    public name: string;

    public description: string;
    public value: any;
    public permission: bigint;
    protected readonly guild: Guild;
    protected constructor(obj: ConstructorArgs) {
        this.name = obj.name;
        this.value = obj.value;
        this.permission = obj.permission;
        this.description = obj.description;
        this.guild = obj.guild


        if (obj.save) this.save = obj.save
        if (obj.parse) this.parse = obj.parse
    }

    public setValue(value: any) {
        this.value = value
    }

    public abstract settingType: string;


    public async save(client: ExtendedClient, data: any): Promise<boolean> {
        return await client.settingsHandler.setSetting(this.guild, this.name, JSON.stringify(data))
    }

    public parse(client: ExtendedClient, data: any) {
        const parsed = JSON.parse(data)
        this.setValue(parsed)
        return parsed
    }

    public abstract run(view: InteractionView, types: typeFile[], currentConfig: SavedSetting, metadata?: any | undefined): unknown


}