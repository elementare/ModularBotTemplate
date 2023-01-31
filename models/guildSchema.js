const mongoose = require('mongoose');

const croleSchema = new mongoose.Schema({
        guildId: {type: String, require: true, unique: true},
        staffRoles: { type: Array },
        permissionIds: {type: Array },
        formCategory: {type: String },
        recepcionistRole: { type: String },
        recepcionistName: { type: String },
        partnerRole: { type: String },
        partnershipRoles: { type: Array },
        dailyReports: { type: Array },
        boosterRoles: { type: Array },
        colorRoleCollection: { type: Array },
        pingCollection: { type: Array },
        dates: {type: Map},
        iconRoles: {type: Map},
        userTexts: {type: Map},
        channels: {type: Map},
        emojiAnchors: {type: Map, default: new Map([
                        ['ffffff', {
                                name: 'Branco',
                                position: 0
                        }],
                        ['000000', {
                                name: 'Preto',
                                position: 1
                        }],
                        ['ff0000', {
                                name: 'Vermelho',
                                position: 2
                        }],
                ['00ff00', {
                    name: 'Verde',
                    position: 3
                }],
                ['0000ff', {
                    name: 'Azul',
                    position: 4
                }]
            ])
        },
    ticketOptions: {type: Array},
    rewardRoles: [{
        role: {type: String},
        vipTimeDays: {type: Number},
        vipId: {type: Number},
        iconAmmount: {type: Number}
    }]
})

const model = new mongoose.model("Guilds", croleSchema);

module.exports = model;