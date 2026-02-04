const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const EstadoSolicitud = require('./estadoSolicitud');
const Area = require('./area');

const Solicitud = sequelize.define('tbl_solicitud', {
    id_solicitud: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    tipo: {
        type: DataTypes.ENUM('ALTA', 'BAJA', 'MODIFICACION'),
        allowNull: false
    },
    usuario_objetivo_nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    usuario_objetivo_dni_ruc: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cargo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    id_area: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    id_estado_solicitud: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        references: {
            model: 'tbl_estado_solicitud',
            key: 'id_estado_solicitud'
        }
    },
    id_creado_por: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: 'tbl_usuario',
            key: 'id_usuario'
        }
    },
    motivo_observacion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    archivo_sustento: {
        type: DataTypes.STRING, // Ruta del archivo
        allowNull: true
    }
}, {
    tableName: 'tbl_solicitud',
    timestamps: true,
    charset: 'utf8',
    collate: 'utf8_unicode_ci'
});

// Relaciones
Solicitud.belongsTo(EstadoSolicitud, { foreignKey: 'id_estado_solicitud', as: 'tbl_estado_solicitud' });
EstadoSolicitud.hasMany(Solicitud, { foreignKey: 'id_estado_solicitud' });

Solicitud.belongsTo(Area, { foreignKey: 'id_area' });
Area.hasMany(Solicitud, { foreignKey: 'id_area' });

module.exports = Solicitud;
