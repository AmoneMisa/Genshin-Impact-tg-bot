import { releasingLock } from '../general/chatLock.js';

export default async function(timeout) {
    return await releasingLock(() => new Promise(resolve => setTimeout(resolve, timeout)));
}
