const path = require('path');
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');
const { config } = require('AppInstance');
const ejs = require('ejs');

class Mailer {

    constructor() {
        this.nodemailerMailgun = nodemailer.createTransport(mg(config.get('mailer')));
    }

    async sendEmail(subject, filename, params, to, cc = null, bcc = null) {
        const emailObject = {
            subject,
            from: 'Eduard Pufal <eduard.pufal@itrexgroup.com>',
            'h:Reply-To': 'Eduard Pufal <eduard.pufal@itrexgroup.com>'
        };

        if (to !== null) {
            emailObject.to = to;
        }

        if (cc !== null) {
            emailObject.cc = cc;
        }

        if (bcc !== null) {
            emailObject.bcc = bcc;
        }

        emailObject.html = await this.__renderEjsFile(filename, params);

        return new Promise((resolve, reject) => {
            this.nodemailerMailgun.sendMail(emailObject, (err, info) => {
                if (err) {
                    return reject(err);
                }
                resolve(info);
            });
        });

    }

    __renderEjsFile(filename, data = {}, options = {}) {
        const emailFile = path.resolve(__dirname, '../templates', `${filename}.ejs`);
        return new Promise((resolve, reject) => {
            ejs.renderFile(emailFile, data, options, (err, str) => {
                if (err) {
                    return reject(err);
                }

                resolve(str);
            });
        });
    }

}

const instance = new Mailer();
module.exports = instance;
