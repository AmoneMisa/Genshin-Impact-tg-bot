export default function (number, chances) {
    for (let {chance, value} of chances) {
        if (number < chance) {
            return value;
        }
        number -= chance;
    }
    throw new Error("Wrong argument");
}