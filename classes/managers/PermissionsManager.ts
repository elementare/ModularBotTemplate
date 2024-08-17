import {
    ExtendedClient, OverrideNode,
    PermissionNode,
    RecursiveMap
} from "../../types";
import {Logger} from "winston";
import {GuildMember, TextChannel} from "discord.js";


function isEndNode(node: PermissionNode | PermissionTree): node is PermissionNode {
    return !(node instanceof Map)
}
type PermissionTree = RecursiveMap<PermissionNode>
export class PermissionsManager {
    private readonly client: ExtendedClient;
    private logger: Logger;
    public permissions: PermissionTree;
    constructor(client: ExtendedClient, logger: Logger) {
        this.logger = logger;
        this.permissions = new Map();
        this.client = client
    }
    registerNode(permission: string, result: PermissionNode) {
        const namespaces = permission.split('.')
        let current = this.permissions
        const last = namespaces.pop()
        if (!last) {
            this.logger.warn(`No namespaces provided`)
            return
        }
        for (const namespace of namespaces) { // Builds the tree
            if (!current.get(namespace)) current.set(namespace, new Map())
            current = current.get(namespace) as PermissionTree
        }
        current.set(last, result)
    }
    getNode(permission: string) {
        const namespaces = permission.split('.')
        let current = this.permissions
        let lastGlobal: PermissionNode | undefined = undefined
        for (const namespace of namespaces) {
            if (!current) {
                return lastGlobal // No global permission set for that namespace scope
            }
            if (isEndNode(current)) {
                return undefined // Reached the end of the tree prematurely
            }
            if (!current.get(namespace)) {
                if (current.get('*')) {
                    lastGlobal = current.get('*') as PermissionNode
                } else {
                    return undefined
                }
            }
            current = current.get(namespace) as PermissionTree
        }
        const finalTest = current as PermissionTree | PermissionNode | undefined

        if (finalTest && isEndNode(finalTest)) return current // Has specific permission set, so it overrides the global one
        return lastGlobal // No global permission set for that namespace scope
    }
    async checkPermissionFor(node: string, member: GuildMember, channel: TextChannel) {
        const permissionNode = this.getNode(node)
        if (!permissionNode) this.logger.warning(`Permission node ${node} not found`)
        if (permissionNode && isEndNode(permissionNode)) return permissionNode(this.client, node, member, channel);
        else return false
    }
    async computePermissions(permission: OverrideNode, member: GuildMember, channel: TextChannel) {
        for (const allow of permission.allow) {
            if (await this.checkPermissionFor(allow, member, channel)) return true // If any allow is true, allow to run
        }
        for (const deny of permission.deny) {
            if (await this.checkPermissionFor(deny, member, channel)) return false // If any deny is true, deny to run, allow overrides deny
        }
        return null // If there are no computed rules, allow to run, this shouldn't happen but just in case
    }
}