
export enum RemoveErrorReason{
    INSUFFICIENT_FUNDS = 0,
}

export enum TransactionType{
    ADD_MONEY = 0,
    REMOVE_MONEY = 1,
    TRANSFER_MONEY = 2
}


export type EconomySettings = {
    name: string,
    coinName: string,
    coinSymbol: string
}