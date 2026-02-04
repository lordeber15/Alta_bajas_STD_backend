const sequelize = require('./config/database');
const Sistema = require('./models/sistema');
const Usuario = require('./models/usuario');
const UsuarioSistema = require('./models/usuarioSistema');
const EstadoSolicitud = require('./models/estadoSolicitud');

/**
 * Script de inicialización:
 * 1. Crea estados de solicitud si no existen.
 * 2. Crea sistemas base si no existen.
 * 3. Asigna todos los sistemas activos a los usuarios que estén activos actualmente (id_estado = 8).
 */
async function seedData() {
    try {
        await sequelize.sync(); // Asegurar tablas

        // 0. Estados de Solicitud
        const estadosBase = [
            { id_estado_solicitud: 1, nombre: 'PENDIENTE_OGA' },    // Solicitado por OGA
            { id_estado_solicitud: 2, nombre: 'EN_PROCESO_USEI' }, // Iniciado por USEI
            { id_estado_solicitud: 3, nombre: 'TECNICO_ETIC' },    // Checklist en ETIC
            { id_estado_solicitud: 4, nombre: 'PARA_VALIDAR' },    // Pendiente firma Jefatura
            { id_estado_solicitud: 5, nombre: 'COMPLETADO' },      // Flujo terminado
            { id_estado_solicitud: 6, nombre: 'OBSERVADO' },       // Devuelto por error
            { id_estado_solicitud: 7, nombre: 'ANULADO' }          // Cancelado por OGA
        ];

        console.log('--- Creando/Actualizando estados de solicitud ---');
        for (const e of estadosBase) {
            await EstadoSolicitud.upsert(e);
        }

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
