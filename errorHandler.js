import fs from 'fs';

export default function () {
    process.on('uncaughtException', function (err) {
        fs.appendFileSync('./api.access.log', `[${new Date().toISOString()}] uncaughtException: ${err.message}\n${err.stack}\n\n`);
        console.error((err && err.stack) ? err.stack : err);
    });

    process.on('unhandledRejection', (err, promise) => {
        fs.appendFileSync('./api.access.log', `[${new Date().toISOString()}] unhandledRejection: ${err && err.message}\n${err && err.stack}\n\n`);
        console.error((err && err.stack) ? err.stack : err);
    });
}
