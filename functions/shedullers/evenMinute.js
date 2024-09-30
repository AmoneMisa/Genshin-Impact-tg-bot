import cron from 'node-cron';

export default function () {
    cron.schedule("* * * * *", () => {
        try {

        } catch (e) {
            console.error(e);
        }
    })
}