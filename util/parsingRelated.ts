import {RecursiveMap} from "../types";


export function parseToDatabase<T>(map: RecursiveMap<T>): [string, T][] {
    const built = [] as [string, T][]
    for (const [key, value] of map.entries()) {
        // @ts-ignore
        if (value instanceof Map) built.push([key, parseToDatabase(value)])
        else built.push([key, value])
    }
    return built
}

export function parseFromDatabase<T>(array: [string, T][]): RecursiveMap<T> {
    const built = new Map()
    for (const [key, value] of array) {
        if (value instanceof Array) built.set(key, parseFromDatabase(value))
        else built.set(key, value)
    }
    return built
}