export default async function(timeout) {
    return await new Promise(resolve => setTimeout(resolve, timeout));
}