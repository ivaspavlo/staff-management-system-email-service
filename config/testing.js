module.exports = {
    mongodb: {
        description: 'localhost',
        options: { autoReconnect: true },
        uri: process.env.MONGODB_URI || 'mongodb://localhost/itrexio-email-service-testing'
    },
    databaseProcess: {
        seed: process.env.SEED_RUN || false,
        migration: process.env.MIGRATION_RUN || false
    }
};
