const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Persona = sequelize.define('tbl_persona', {
    id_persona: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    documento: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cargo: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'tbl_persona',
    timestamps: false
});

module.exports = Persona;
