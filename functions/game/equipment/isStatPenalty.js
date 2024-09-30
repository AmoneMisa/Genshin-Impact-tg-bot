export default function (name, value) {
    if (name === "incomingDamageModifier") {
        return value > 1;
    }

    if (name.includes("Mul")) {
        return value < 1;
    }

    return value < 0;
};