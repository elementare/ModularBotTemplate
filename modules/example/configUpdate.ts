import { configFunc } from "../../types";
export const config: configFunc = async ({  logger }) => {
    logger.info('Example config update function')
    return true
}