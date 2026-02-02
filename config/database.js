const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
        define: {
            timestamps: false,
            freezeTableName: true,
            charset: 'utf8',
            collate: 'utf8_unicode_ci'
        }
    }
);

module.exports = sequelize;
