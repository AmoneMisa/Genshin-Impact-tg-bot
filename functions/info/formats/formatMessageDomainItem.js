module.exports = function (item) {
    function getRecommendedElements(recommendedElements) {
        let str = "";
        if (typeof recommendedElements === 'object') {
            for (let element of recommendedElements) {
                str += `${element};\n`;
            }
        } else {
            str = recommendedElements;
        }
        return str;
    }

    let title = `${item.name} ${item.type}\n\n`;
    let description = `Description: ${item.description}\n\n`;
    let location = `Location: ${item.location}\n\n`;
    let nation = `Nation: ${item.nation}\n\n`;
    let recommendedElements = `Recommended elements:\n ${getRecommendedElements(item.recommendedElements)}\n`;
    return title + description + location + nation + recommendedElements;
};