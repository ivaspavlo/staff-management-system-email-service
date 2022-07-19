const monq = require('monq');
const { config } = require('AppInstance');
const client = monq(config.get('mongodb.uri'), { safe: true });

class Queue {

    constructor(service) {
        this.service = service;
        this.queue = client.queue('processNotifications');
        this.worker = client.worker(['processNotifications']);
        this.registerWorkers();
        this.worker.on('error', function (err) {
            console.log(err);
        });
        this.worker.on('failed', function (data) {
            console.log(data);
        });
        this.worker.start();
        this.queue.enqueue('processHolidays', { daysQty: 30, noticeType: 'emailMonthBefore' }, function (err, job) {
            if (err) throw err;
            console.log('processHolidays:', job.data);
        });
    }

    registerWorkers() {
        this.worker.register({
            processHolidays: this.__processHolidays.bind(this),
            processNotifications: this.__processNotifications.bind(this)
        });
    }

    async __processNotifications(params, callback) {
        try {
            console.log(params);
            return callback(null, { result: 'DONE!' });
        } catch (error) {
            return callback(error);
        }
    }

    async __processHolidays(params, callback) {
        try {
            const { daysQty, noticeType } = params;
            const isHoliday = await this.service.holidayChecker(daysQty);
            const holidays = noticeType === 'emailMonthBefore' ? await this.service.getHolidaysForPeriod() : await this.service.getHolidaysAfterThreeDays();
            const isHistory = holidays.length ? await this.service.checkSentHistory(holidays, noticeType) : false;
            if (isHoliday || isHistory) {
                const promises = holidays.map((holiday) => {
                    return this.service.getEmployeesList(holiday);
                });
                const employees = await Promise.all(promises);
                const clients = await this.service.getClientsForNotification(holidays);
                this.queue.enqueue('processNotifications', { clients, employees }, (err, job) => {
                    if (err) throw err;
                    console.log('Enqueued:', job.data);
                });
                callback(null, { result: '__processHolidays DONE' });
            }
        } catch (error) {
            return callback(error);
        }
    }

}


module.exports = Queue;
