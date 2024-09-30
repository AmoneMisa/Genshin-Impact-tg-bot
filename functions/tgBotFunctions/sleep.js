export default async function sleep(timeout) {
    return await new Promise(resolve => setTimeout(resolve, timeout));
}