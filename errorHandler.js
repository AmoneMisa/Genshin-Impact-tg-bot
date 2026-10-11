import fs from 'fs';
let writes = Promise.resolve();
const MAX_LOG_BYTES = 5 * 1024 * 1024;
function record(kind, error) {
    const entry = `[${new Date().toISOString()}] ${kind}: ${error?.message}\n${error?.stack}\n\n`;
    writes = writes.catch(() => {}).then(async () => {
        const size = await fs.promises.stat('./api.access.log').then(s=>s.size,()=>0);
        if (size >= MAX_LOG_BYTES) await fs.promises.rename('./api.access.log','./api.access.log.1');
        await fs.promises.appendFile('./api.access.log',entry);
    }).catch(error => console.error('Error log write failed:',error.message));
    console.error(error?.stack || error);
}

export default function () {
    process.on('uncaughtException', function (err) {
        record('uncaughtException',err);
    });

    process.on('unhandledRejection', (err, promise) => {
        record('unhandledRejection',err);
    });
}
