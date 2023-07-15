const fs = require("fs");

module.exports = function (imageName) {
    let imageData = fs.existsSync("imagesIds.json") ? JSON.parse(fs.readFileSync("imagesIds.json")) : {};

    if (imageData[imageName]) {
        return imageData[imageName];
    }
    return false;
};