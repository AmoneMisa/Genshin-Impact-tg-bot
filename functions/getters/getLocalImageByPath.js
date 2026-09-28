import fs from 'fs';

export default function (number, path) {
    const imagePath = `images/${path}`;
    let files;

    try {
        files = fs.readdirSync(imagePath);
    } catch (e) {
        // Missing asset directory (e.g. a newly added building with no images
        // yet) — callers already fall back to a text-only message when this
        // returns undefined, so degrade instead of crashing the handler.
        return undefined;
    }

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