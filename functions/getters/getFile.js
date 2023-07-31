const fs = require("fs");

module.exports = function (imagePath, fileName) {
    const files = fs.readdirSync(imagePath);

    let foundFile = files.find(_file => {
        let match = _file.match(/^(.*)\.(?:jpg|gif|png)$/);

        if (!match) {
            return false;
        }

        return match[1] === fileName;
    });

    if (!foundFile) {
        return null;
    }

    return `${imagePath}/${foundFile}`;
}