const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EstadoSolicitud = sequelize.define('tbl_estado_solicitud', {
    id_estado_solicitud: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'tbl_estado_solicitud',
    timestamps: true,
    charset: 'utf8',
    collate: 'utf8_unicode_ci'
});

module.exports = EstadoSolicitud;
