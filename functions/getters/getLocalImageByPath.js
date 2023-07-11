const fs = require('fs');

module.exports = function (number, path) {
    const imagePath = `images/${path}`;
    const files = fs.readdirSync(imagePath);

    for (const file of files) {
        const match = file.match(/(\d+)-(\d+)/);

        if (match) {
            const start = parseInt(match[1]);
            const end = parseInt(match[2]);

            if (start <= number && number <= end) {
                return fs.createReadStream(`${imagePath}/${file}`);
            }
        }
    }
}