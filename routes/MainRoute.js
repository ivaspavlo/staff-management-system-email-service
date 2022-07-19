const AppInstance = require('AppInstance');
const { routerCustom } = AppInstance.services;
const router = new routerCustom();
const MainCtrl = require('controllers/MainController');

router.add({
    tags: [ 'API version' ],
    method: 'get',
    path: '/',
    swaggerPath: '',
    description: 'Return version of microservice',
    controller: MainCtrl.index
});

router.add({
    tags: [ 'Email service' ],
    method: 'post',
    path: '/sendEmail',
    swaggerPath: 'sendEmail',
    description: 'Send email via Mailgun',
    controller: MainCtrl.sendEmailMessage,
    restSwagger: {
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            to: {
                                type: 'string',
                                description: 'Send to'
                            },
                            cc: {
                                type: 'string',
                                description: 'Send cc'
                            }
                        }
                    }
                }
            }
        }
    }
});

router.add({
    tags: [ 'Email service' ],
    method: 'get',
    path: '/renderEmail',
    swaggerPath: 'renderEmail',
    description: 'Return html template for email',
    controller: MainCtrl.renderEmail.bind(MainCtrl)
});

module.exports = router;
