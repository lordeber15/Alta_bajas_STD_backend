const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sistema = sequelize.define('tbl_sistema', {
    id_sistema: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    aplica_alta: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    aplica_baja: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    requiere_detalle: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    estado: {
        type: DataTypes.INTEGER,
        defaultValue: 1 // 1: Activo, 0: Inactivo
    }
}, {
    tableName: 'tbl_sistema',
    timestamps: true,
    charset: 'utf8',
    collate: 'utf8_unicode_ci'
});

module.exports = Sistema;
