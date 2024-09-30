import fs from 'fs';

export default function (number, path) {
    const imagePath = `images/${path}`;
    const files = fs.readdirSync(imagePath);

    for (const file of files) {
        const match = file.match(/(\d+)-(\d+)/);

        if (match) {
            const start = parseInt(match[1]);
            const end = parseInt(match[2]);

            if (start <= number && number <= end) {
                return `${imagePath}/${file}`;
            }
        }
    }
}