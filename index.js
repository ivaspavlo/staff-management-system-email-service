// eslint-disable-next-line
require('dotenv')
    .config({ path: `${__dirname}/../env/.env-email-service` });

const AppInstance = require('AppInstance');
const { models } = AppInstance;
const HolidayNotificationService = require('./utils/holidayNotificationService');
const Queue = require('./utils/queue');

const AppInstancePromise = AppInstance.init()
    .then(() => {
        const routes = require('routes'); // eslint-disable-line
        // AppInstance.enableCoreRoutes();
        AppInstance.addRoutes(routes);
        AppInstance.proceedRoutes();

        // AppInstance.addMiddleware();
        AppInstance.enableSwagger({ title: 'ITRexIO Email Service' }, [ 'empty' ]);
        const holidayService = new HolidayNotificationService(models);
        const queue = new Queue(holidayService);
        return AppInstance.start();
    })
    .then(() => {
        console.log('App is ready.'); // eslint-disable-line
        return AppInstance;
    });

module.exports = AppInstancePromise;
