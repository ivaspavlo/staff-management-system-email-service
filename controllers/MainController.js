
const mailer = require('../utils/mailer');
const { each, set, sortBy, map } = require('lodash');
const moment = require('moment');

const styles = {
    disabled: 'padding: 2px 0; color: #aaa;',
    usual: 'padding: 2px 0;',
    holidayWhite: 'color: #FFF; font-weight: bold;',
    dayOffBLR: 'background-color: #6fb440; padding: 2px 0; border: 3px solid #f44;',
    dayOffUA: 'background-color: #ffd500; padding: 2px 0; border: 3px solid #f44;',
    dayOffALL: 'padding: 2px 0; background: #d00; border: 3px solid #f44;',
    workingDayBLR: 'background-color: #6fb440; padding: 2px 0; border: 3px solid #7fcf4a;',
    workingDayUA: 'background-color: #ffd500; padding: 2px 0; border: 3px solid #7fcf4a;',
    workingDayALL: 'background: #0b0; padding: 2px 0; border: 3px solid #7fcf4a;',
    flagBLR: 'https://storage.itrex.io/email-assets/blr-flag.png',
    flagUA: 'https://storage.itrex.io/email-assets/ua-flag.png'
};

class MainController {

    index() {
        return { name: 'ITRexIO MY API' };
    }

    __generateCalendar(year, month, holidays) {
        const momentDate = moment(`${year}-${month}-01`);
        const startWeek = momentDate.startOf('month').isoWeek();
        const endWeek = momentDate.endOf('month').isoWeek();

        const calendar = [];
        for (let week = startWeek; week <= endWeek; week += 1) {
            calendar.push({
                week,
                days: Array(7).fill(0)
                    .map((n, i) => {
                        const day = moment().isoWeek(week)
                            .startOf('isoWeek')
                            .clone()
                            .add(n + i, 'day');

                        const monthYear = day.format('YYYY-MM');
                        const fullDay = day.format('YYYY-MM-DD');
                        const object = {
                            label: day.format('D'),
                            style: styles.usual
                        };

                        if (monthYear === `${year}-${month}`) {
                            if (i === 5 || i === 6) {
                                object.style = styles.disabled;
                            }

                            const shifted = holidays.shifted[fullDay];
                            if (shifted) {
                                if (shifted !== 'ALL') {
                                    object.background = styles[`flag${shifted}`];
                                }

                                object.style = styles[`workingDay${shifted}`];
                                object.labelWrapper = styles.holidayWhite;
                            }

                            const dayOff = holidays.dates[fullDay];
                            if (dayOff) {
                                if (dayOff !== 'ALL') {
                                    object.background = styles[`flag${dayOff}`];
                                }

                                object.style = styles[`dayOff${dayOff}`];
                                object.labelWrapper = styles.holidayWhite;
                            }
                        } else {
                            object.style = styles.disabled;
                        }

                        return object;
                    })
            });
        }
        return calendar;
    }

    __fakeData(inputData) {
        const months = {};
        const calendarHolidays = {
            dates: {},
            shifted: {}
        };
        const data = [];

        each(inputData, (iData) => {
            const { country: { code: countryCode }, country, team } = iData;
            const dates = sortBy(iData.dates, [ 'date' ]);

            const formatedDates = map(dates, (d) => {
                const momentDate = moment(d.date);
                const momentShiftedTo = d.shiftedTo ? moment(d.shiftedTo) : null;
                set(months, `${momentDate.format('YYYY')}.${momentDate.format('MM')}`, momentDate.format('MMMM'));
                set(data, `${countryCode}.${d.date}`, {});

                const holidayFormat = momentDate.format('YYYY-MM-DD');
                if (!calendarHolidays.dates[holidayFormat]) {
                    calendarHolidays.dates[holidayFormat] = countryCode;
                } else if (calendarHolidays.dates[holidayFormat] !== countryCode) {
                    calendarHolidays.dates[holidayFormat] = 'ALL';
                }

                if (momentShiftedTo !== null) {
                    const shiftedFormat = momentShiftedTo.format('YYYY-MM-DD');
                    if (!calendarHolidays.shifted[shiftedFormat]) {
                        calendarHolidays.shifted[shiftedFormat] = countryCode;
                    } else if (calendarHolidays.shifted[shiftedFormat] !== countryCode) {
                        calendarHolidays.shifted[shiftedFormat] = 'ALL';
                    }
                }

                return {
                    type: d.type,
                    originalDay: d.date,
                    originalShiftedDay: d.shiftedTo ? d.shiftedTo : null,
                    day: momentDate.format('MMMM D, YYYY'),
                    dayOfWeek: momentDate.format('dddd'),
                    shiftedDay: momentShiftedTo ? momentShiftedTo.format('MMMM D, YYYY') : null,
                    shiftedDayOfWeek: momentShiftedTo ? momentShiftedTo.format('dddd') : null
                };
            });

            data.push({
                countryImage: styles[`flag${countryCode}`],
                country,
                dates: formatedDates,
                team
            });
        });

        const calendars = [];

        each(months, (values, yearKey) => {
            each(values, (monthName, monthKey) => {
                calendars.push({
                    name: `${monthName} ${yearKey}`,
                    weeks: this.__generateCalendar(yearKey, monthKey, calendarHolidays)
                });
            });
        });

        return { calendars, data };
    }

    async renderEmail({ query }) {
        const { calendars, data } = this.__fakeData([
            {
                country: {
                    name: 'Ukraine',
                    code: 'UA'
                },
                dates: [
                    {
                        type: 'fixed',
                        date: '2018-08-24'
                    }
                ],
                team: []
            }
        ]);
        const html = await mailer.__renderEjsFile(query.filename, { calendars, data });

        return { renderHTML: true, data: html };
    }

    async sendEmailMessage({ body }) {
        const { to = null, cc = null } = body;

        const result = await mailer.sendEmail('ITRex Group: Upcoming public holidays in June, 2018', 'holidays', { user: { firstName: 'Chris' } }, to, cc);
        return { result };
    }

}

module.exports = new MainController();
