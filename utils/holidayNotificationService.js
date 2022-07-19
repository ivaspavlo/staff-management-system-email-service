const moment = require('moment');
const { ObjectId } = require('mongoose').Types;
const AppInstance = require('AppInstance');
const { helpers: { setZeroTime } } = AppInstance.services;
const Boom = require('boom');

class HolidayNotificationService {

    constructor(models) {
        this.models = models;
    }

    async checkSentHistory(holiday, noticeType) {
        const informedContacts = await this.models.SentHistory.find({ 'event': holiday._id, noticeType }).exec()
            .map((a) => {
                return a.addressee;
            });
        const notInformedEmployees = await this.models.Employee.find({ '_id': { $nin: informedContacts } }).exec()
            .map((a) => {
                return a._id;
            });
        const notInformedClientContacts = await this.models.ClientContact.find({ '_id': { $nin: informedContacts } }).exec()
            .map((a) => {
                return a._id;
            });

        return {
            notInformedEmployees,
            notInformedClientContacts
        };
    }

    async threeDaysHolidayChecker() {
        const holiday = await this.models.Holiday.find({
            $where() {
                return this.to.getFullYear() === new Date().getFullYear() &&
                    this.to.getMonth() === new Date().getMonth() &&
                    this.to.getDate() === (new Date().getDate() + 3);
            }
        });

        return holiday.length > 0 ? holiday : null;
    }

    async sentHistoryRemover() {
        await this.models.SentHistory.find({
            $where() {
                return this.dateSent.getFullYear() < new Date().getFullYear();
            }
        }).remove({}, (err) => {
            throw Boom(err);
        });
    }

    async getEmployeesList(holiday) {
        const [ result ] = await this.models.Holiday.aggregate([
            { $match: { _id: ObjectId(holiday._id) } },
            {
                $lookup: {
                    from: 'holidayschemas',
                    localField: 'holidaySchema',
                    foreignField: '_id',
                    as: 'holidaySchema'
                }
            },
            { $unwind: { path: '$holidaySchema', preserveNullAndEmptyArrays: true } },
            {
                $facet: {
                    local: [
                        {
                            $lookup: {
                                from: 'offices',
                                let: { 'officesIdArr': '$holidaySchema.offices' },
                                pipeline: [ { $match: { $expr: { $and: [ { $in: [ '$_id', '$$officesIdArr' ] } ] } } } ],
                                as: 'office'
                            }
                        },
                        { $unwind: { path: '$office', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'employees',
                                localField: 'office._id',
                                foreignField: 'office',
                                as: 'employee'
                            }
                        },
                        { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'employeeprojects',
                                let: { employeeId: '$employee._id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: [ '$employee', '$$employeeId' ] },
                                                    { $lt: [ '$endDate', null ] }
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: 'projects',
                                            localField: 'project',
                                            foreignField: '_id',
                                            as: 'project'
                                        }
                                    },
                                    { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } }
                                ],
                                as: 'employeeProject'
                            }
                        },
                        { $unwind: { path: '$employeeProject', preserveNullAndEmptyArrays: true } },
                        { $group: { _id: '$employeeProject.project', employees: { $addToSet: '$employee' } } }
                    ],
                    foreign: [
                        {
                            $lookup: {
                                from: 'offices',
                                let: { 'officesIdArr': '$holidaySchema.offices' },
                                pipeline: [ { $match: { $expr: { $and: [ { $not: [ { $in: [ '$_id', '$$officesIdArr' ] } ] } ] } } } ],
                                as: 'office'
                            }
                        },
                        { $unwind: { path: '$office', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'employees',
                                localField: 'office._id',
                                foreignField: 'office',
                                as: 'employee'
                            }
                        },
                        { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'employeeprojects',
                                let: { employeeId: '$employee._id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: [ '$employee', '$$employeeId' ] },
                                                    { $lt: [ '$endDate', null ] }
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: 'projects',
                                            localField: 'project',
                                            foreignField: '_id',
                                            as: 'project'
                                        }
                                    },
                                    { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } }
                                ],
                                as: 'employeeProject'
                            }
                        },
                        { $unwind: { path: '$employeeProject', preserveNullAndEmptyArrays: true } },
                        { $group: { _id: '$employeeProject.project', employees: { $addToSet: '$employee' } } }
                    ]
                }
            }
        ]).exec();

        return this.__mapResults(result);
    }

    async holidayChecker(daysQty) {
        const day = setZeroTime().add(daysQty, 'days')
            .toDate();
        const holidays = await this.models.Holiday.find({ to: day }).count();
        return Boolean(holidays);
    }

    async getHolidaysForPeriod(start, end) {
        const day = setZeroTime().add(30, 'days');
        const startDate = start || moment(day).startOf('month')
            .toDate();
        const endDate = end || moment(day).endOf('month')
            .toDate();
        const holidays = await this.models.Holiday.find({ to: { $gte: startDate, $lte: endDate } }).sort({ to: 1 })
            .populate('holidaySchema')
            .lean();
        return holidays;
    }

    async getHolidaysAfterThreeDays() {
        const start = setZeroTime().add(3, 'days')
            .toDate();
        const end = setZeroTime().endOf('month')
            .toDate();
        const holidays = await this.getHolidaysForPeriod(start, end);
        const threeDayHolidays = holidays.reduce((dates, holiday) => {
            if (dates.length) {
                const last = dates[dates.length - 1];
                const diff = moment(holiday.to).diff(last.to, 'days');
                if (diff && diff <= 2) {
                    const daysOff = this.__range(last, holiday).map((day) => this.__isDayOff(day));
                    if (daysOff.length === diff) {
                        dates.push(holiday);
                    }
                }
            } else {
                dates.push(holiday);
            }
            return dates;
        }, []);
        return threeDayHolidays;
    }

    async getClientsForNotification(holidays) {
        const offices = this.__getUniqOffices(holidays);
        const clientInfo = await this.models.Project.aggregate(this.__clientsNotificationAggrQuery(offices));
        return clientInfo;
    }

    __mapResults(intermediateRes) {
        const result = [];
        intermediateRes.foreign.forEach((project) => {
            if (project._id !== null) {
                const resItem = {};
                const localProj = intermediateRes.local.find((elem) => {
                    return elem._id !== null && project._id._id.toString() === elem._id._id.toString();
                });
                if (localProj) {
                    const toSend = [];
                    project.employees.forEach((employee) => {
                        const sendItem = {};
                        sendItem.employeeToInform = employee;
                        sendItem.employeesWithHoliday = localProj.employees;
                        toSend.push(sendItem);
                    });
                    resItem.project = project._id;
                    resItem.toSend = toSend;
                    result.push(resItem);
                }
            }
        });
        return result;
    }

    __clientsNotificationAggrQuery(offices) {
        return [
            { $match: { status: 'active' } },
            { $lookup: { from: 'employeeprojects', localField: '_id', foreignField: 'project', as: 'employee' } },
            { $lookup: { from: 'employees', localField: 'employee.employee', foreignField: '_id', as: 'employee' } },
            { $lookup: { from: 'clientcontacts', localField: 'clientContacts', foreignField: '_id', as: 'clientContacts' } },
            { $unwind: { path: '$clientContacts', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
            { $match: { 'employee.office': { $in: offices } } },
            { $group: { _id: '$clientContacts', 'employees': { $addToSet: '$employee' } } },
            { $addFields: { offices } },
            { $lookup: { from: 'offices', localField: 'offices', foreignField: '_id', as: 'offices' } },
            { $unwind: { path: '$offices' } },
            { $project: { _id: 0, clientContact: '$_id', offices: 1, employees: 1 } },
            { $unwind: { path: '$employees' } },
            { $group: { _id: { clientContact: '$clientContact', offices: '$offices' }, 'employees': { $addToSet: '$employees' } } },
            { $project: { _id: 0, clientContact: '$_id.clientContact', office: '$_id.offices', employees: 1 } },
            {
                $group: {
                    _id: '$clientContact',
                    offices: {
                        $push: {
                            office: '$office',
                            employees: {
                                $filter: {
                                    input: '$employees',
                                    as: 'employee',
                                    cond: { $eq: [ '$$employee.office', '$office._id' ] }
                                }
                            }
                        }
                    }
                }
            },
            { $project: { _id: 0, clientContact: '$_id', offices: 1 } }
        ];
    }

    __getUniqOffices(holidays) {
        let offices = holidays.reduce((_offices, _holliday) => {
            const stringifiedIDs = _holliday.holidaySchema.offices.map((h) => h.toString());
            _offices.push(...stringifiedIDs);
            return _offices;
        }, []);
        const officesSet = new Set(offices);
        offices = [ ...officesSet ];
        return offices.map((o) => ObjectId(o));
    }

    __isDayOff(date) {
        return date.getDay() === 0 || date.getDay() === 6;
    }

    __range(start, end) {
        const dates = [];
        const diff = moment(end.to).diff(start.to, 'days');
        for (let i = 1; i <= diff; i += 1) {
            dates.push(moment(start.to).add(i, 'days'));
        }
        return dates;
    }

}

module.exports = HolidayNotificationService;
