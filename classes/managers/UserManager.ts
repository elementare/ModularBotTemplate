import {Client} from "discord.js";

const User = require('../structs/User');
const profileModel = require("../../models/profileSchema");
export default class userHandler {
    private readonly client: any;
    constructor(client: Client) {
        this.client = client
    }
    fetch(id: string) {
        return new Promise(async (resolve, err) => {
            const userProfile = await profileModel.findOne({userId: id})
            if (!userProfile) return err('No user profile!')
            const member = await this.client.guilds.cache.get('921162438001447023').members.fetch(id).catch(() => {
            })
            if (!member) return err('No member!')
            resolve(new User(this.client, member, userProfile))
        })
    }

    fetchOrCreate(id: string) {
        return new Promise(async (resolve, err) => {
            let userProfile = await profileModel.findOne({userId: id})
            if (!userProfile) {
                console.log('Creating user profile for id: ' + id)
                const profile = await profileModel.create({
                    userId: id
                })
                await profile.save()
                userProfile = await profileModel.findOne({userId: id})
            }
            const member = await this.client.guilds.cache.get('921162438001447023').members.fetch(id).catch(() => {
            })

            if (!member) {
                // console.log(`Um ‘id’ foi requisitado, mas o membro não está mais no servidor (ID: ${id})\n${userProfile}`)
                await userProfile.delete()
                return resolve(undefined)
            }
            resolve(new User(this.client, member, userProfile))
        })
    }

    delete(id: string) {
        return new Promise(async (resolve, err) => {
            const userProfile = await profileModel.findOneAndDelete({userId: id})
            if (!userProfile) err('No user profile!')
            resolve(userProfile)
        })
    }

    create(id: string) {
        return new Promise(async (resolve, err) => {
            const userProfile = await profileModel.create({
                userId: id
            }).save();
            const member = await this.client.guilds.cache.get('921162438001447023').members.fetch(id).catch(() => {
            })
            if (!member) return err('No member!')
            resolve(new User(this.client, member, userProfile))
        })
    }

    findOrCreateProfile(id: string) {
        return new Promise(async (resolve) => {
            let userProfile = await profileModel.findOne({userId: id})
            if (!userProfile) {
                const profile = await profileModel.create({
                    userId: id
                })
                await profile.save()
                userProfile = await profileModel.findOne({userId: id})
            }
            resolve(userProfile)
        })
    }

    findByKV(filter: any) {
        return new Promise(async (resolve, err) => {
            const userProfile = await profileModel.find(filter)
            if (!userProfile || userProfile.length === 0) return err('No user profiles!')
            const members = await this.client.guilds.cache.get('921162438001447023').members.fetch().catch(() => {
            })
            resolve(userProfile.map((profile: any) => {
                const member = members.get(profile.userId)
                if (!member) {
                    profile.delete()
                    return undefined
                }
                return new User(this.client, member, profile)
            }).filter((user: any) => user !== undefined))
        })
    }
}