const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Solicitud = require('./solicitud');
const Sistema = require('./sistema');

const SolicitudSistema = sequelize.define('tbl_solicitud_sistema', {
    id_solicitud_sistema: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    id_solicitud: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: 'tbl_solicitud',
            key: 'id_solicitud'
        }
    },
    id_sistema: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: 'tbl_sistema',
            key: 'id_sistema'
        }
    },
    detalle: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    estado_atencion: {
        type: DataTypes.ENUM('PENDIENTE', 'COMPLETADO'),
        defaultValue: 'PENDIENTE'
    }
}, {
    tableName: 'tbl_solicitud_sistema',
    timestamps: false,
    charset: 'utf8',
    collate: 'utf8_unicode_ci'
});

// Relaciones
Solicitud.hasMany(SolicitudSistema, { foreignKey: 'id_solicitud' });
SolicitudSistema.belongsTo(Solicitud, { foreignKey: 'id_solicitud' });

Sistema.hasMany(SolicitudSistema, { foreignKey: 'id_sistema' });
SolicitudSistema.belongsTo(Sistema, { foreignKey: 'id_sistema' });

module.exports = SolicitudSistema;
