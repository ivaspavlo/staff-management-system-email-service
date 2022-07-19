const AppInstance = require('AppInstance');
const { routerCustom } = AppInstance.services;
const router = new routerCustom();

const main = require('./MainRoute');

router.use({
    path: '/',
    child: main
});

module.exports = router;
