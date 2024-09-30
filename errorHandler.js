import fs from 'fs';

export default function () {
    process.on('uncaughtException', function (err) {
        fs.writeFileSync('./api.access.log', `${err.message}\n\n${err.stack}`);
        console.error((err && err.stack) ? err.stack : err);
    });

    process.on('unhandledRejection', (err, promise) => {
        fs.writeFileSync('./api.access.log', `${err.message}\n\n${err.stack}`);
        console.error((err && err.stack) ? err.stack : err);
    });
}
