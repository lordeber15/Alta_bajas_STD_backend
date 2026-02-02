const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./usuario');
const Sistema = require('./sistema');

const UsuarioSistema = sequelize.define('tbl_usuario_sistema', {
    id_usuario_sistema: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: 'tbl_usuario',
            key: 'id_usuario'
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
    id_estado_acceso: {
        type: DataTypes.INTEGER,
        defaultValue: 1 // 1: Activo, 0: Revocado
    }
}, {
    tableName: 'tbl_usuario_sistema',
    timestamps: true,
    charset: 'utf8',
    collate: 'utf8_unicode_ci'
});

// Relaciones
Usuario.hasMany(UsuarioSistema, { foreignKey: 'id_usuario' });
UsuarioSistema.belongsTo(Usuario, { foreignKey: 'id_usuario' });

Sistema.hasMany(UsuarioSistema, { foreignKey: 'id_sistema' });
UsuarioSistema.belongsTo(Sistema, { foreignKey: 'id_sistema' });

module.exports = UsuarioSistema;
