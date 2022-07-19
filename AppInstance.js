
const CoreApp = require(process.env.CORE_PATH || 'itrexio-core');
const AppInstance = new CoreApp();
const { config } = AppInstance;

const configProjectDefault = require('config/default');
config.addConfig(configProjectDefault);
const configProjectEnv = require(`config/${config.get('env')}.js`);
config.addConfig(configProjectEnv);

module.exports = AppInstance;
