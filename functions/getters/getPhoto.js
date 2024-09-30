import fs from 'fs';

export default function (imageName) {
    let imageData = fs.existsSync("imagesIds.json") ? JSON.parse(fs.readFileSync("imagesIds.json")) : {};

    if (imageData[imageName]) {
        return imageData[imageName];
    }
    return false;
};