const sequelize = require('./config/database');
const Sistema = require('./models/sistema');
const Usuario = require('./models/usuario');
const UsuarioSistema = require('./models/usuarioSistema');

/**
 * Script de inicialización:
 * 1. Crea sistemas base si no existen.
 * 2. Asigna todos los sistemas activos a los usuarios que estén activos actualmente (id_estado = 8).
 */
async function seedData() {
    try {
        await sequelize.sync(); // Asegurar tablas

        // 1. Sistemas base
        const sistemasBase = [
            { nombre: 'Correo Institucional', codigo: 'CORREO', requiere_detalle: true },
            { nombre: 'SIGEIN', codigo: 'SIGEIN', requiere_detalle: false },
            { nombre: 'Sistema de Trámite Documentario', codigo: 'STD', requiere_detalle: false },
            { nombre: 'Acceso a Red / Carpetas', codigo: 'RED', requiere_detalle: true },
            { nombre: 'VPN', codigo: 'VPN', requiere_detalle: false },
            { nombre: 'SIAF', codigo: 'SIAF', requiere_detalle: true }
        ];

        console.log('--- Creando sistemas base ---');
        for (const s of sistemasBase) {
            await Sistema.findOrCreate({
                where: { codigo: s.codigo },
                defaults: s
            });
        }

        // 2. Usuarios Activos -> Todos los sistemas
        console.log('--- Asignando sistemas a usuarios activos actuales ---');
        const usuariosActivos = await Usuario.findAll({ where: { id_estado: 8 } });
        const todosLosSistemas = await Sistema.findAll({ where: { estado: 1 } });

        for (const user of usuariosActivos) {
            for (const sis of todosLosSistemas) {
                await UsuarioSistema.findOrCreate({
                    where: {
                        id_usuario: user.id_usuario,
                        id_sistema: sis.id_sistema
                    },
                    defaults: { id_estado_acceso: 1 }
                });
            }
        }

        console.log('--- Inicialización completada con éxito ---');
        process.exit(0);
    } catch (error) {
        console.error('Error en la inicialización:', error);
        process.exit(1);
    }
}

seedData();
