const fs = require("fs");
module.exports = function (imageName, photoId) {
    let imageData = fs.existsSync("imagesIds.json") ? JSON.parse(fs.readFileSync("imagesIds.json")) : {};
    imageData[imageName] = photoId;
    fs.writeFileSync("imagesIds.json", JSON.stringify(imageData));
}