module.exports = {
    databaseProcess: {
        seed: process.env.SEED_RUN || true,
        migration: process.env.MIGRATION_RUN || true
    }
};
