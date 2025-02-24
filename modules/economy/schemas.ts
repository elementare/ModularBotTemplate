import { Schema, model  } from "mongoose";

export const user = new Schema({
    balance: { type: Number, default: 0, required: true },
});


// export const transactionsSchema = new Schema({
//     transactionId: { type: String, required: true, unique: true },
//     date: { type: Date, default: Date.now },
//     type: { type: Number, required: true },
//     payer: { type: String, required: true },
//     receiver: { type: String, required: true },
//     value: { type: Number, required: true }
// });


// export const TransactionModel = model("Transactions", transactionsSchema);
