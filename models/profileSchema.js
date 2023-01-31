const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    userId: {type: String, require: true, unique: true},
    invitedBy: {type: String, require: false, default: '0'},
    vipExpiry: {type: Number, require: false},
    vipType: {type: String, require: true, default: "Membro"},
    vipPosition: {type: Number, require: false},
    badges: [{type: mongoose.Types.ObjectId, require: false, ref: 'Badge Documents'}],
    balance: {type: Number, require: false, default: 0},
    times: {type: Array, require: false},
    invitedUsers: {type: Array, require: false},
    banned: {type: String, require: false},
    punishments: {type: Map, require: false},
    timers: {
        daily: {type: Number, default: 0}
    },
    vip: {
        type: {type: mongoose.Types.ObjectId, require: false, ref: 'Vip Types'},
        expiry: {type: Number, require: false}
    },
    inventory: [{
        item: {type: mongoose.Types.ObjectId, ref: "Itens"},
        quantity: {type: Number, default: 1},
        _id: false
    }],
    beta: {type: Boolean},
    developer: {type: Boolean},
    modLogs: {type: Map},
    tempoCall: {type: Number, default: 0},
    profile: {
        about: {
            type: String,
            default: "Aqui está mais quieto do que reunião de mudos! Mas relaxa, você pode modificar seu about com k!about"
        },
        background: {type: String, default: "https://kikyo.s3.amazonaws.com/profileBackgrounds/3343698150044.jpeg"},
        backgroundKey: {type: String, default: "default"},
        marryId: {type: String},
        hue: {type: Number, default: 0},
        hex: {type: String, default: "#589631"},
    },
    oneTimeUse: {
        doubleBoostVipGive: {type: Boolean, default: false}
    },
    configs: {
        type: Map, default: [
            ["defaultMessagesSearched", 50],
            ["defaultPruneMethod", "bot"]
        ]
    },
    partnership: {
        time: {type: Number},
        messages: {type: Array}
    },
    partnerships: {type: Array, require: false},
    watchList: [{
        anime: {type: mongoose.Types.ObjectId, ref: "Releasing Anime"},
        animeId: {type: String},
    }],
})

const model = new mongoose.model("Profiles", profileSchema);

module.exports.model = model;
module.exports = model;