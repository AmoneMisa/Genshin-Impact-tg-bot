import { sessions } from '../../data.js';
import getMembers from '../getters/getMembers.js';

export default function () {
    for (let chatId of Object.keys(sessions)) {
        for (let member of Object.values(getMembers(chatId))) {
            for (let [buildName, build] of Object.entries(await getBuildsList(chatId, userId))) {

            }
        }
    }
}