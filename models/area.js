const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Area = sequelize.define('tbl_area', {
    id_area: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    area: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'tbl_area',
    timestamps: false
});

module.exports = Area;
