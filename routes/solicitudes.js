const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Solicitud = require('../models/solicitud');
const EstadoSolicitud = require('../models/estadoSolicitud');
const SolicitudSistema = require('../models/solicitudSistema');
const Persona = require('../models/persona');
const Area = require('../models/area');
const Sistema = require('../models/sistema');
const sequelize = require('../config/database');

// Las relaciones se manejan en los modelos para evitar redundancia

// Configuración de Multer para archivos de sustento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

/**
 * Obtener solicitudes filtradas por estado o tipo
 */
router.get('/', async (req, res) => {
    try {
        const list = await Solicitud.findAll({
            include: [
                { model: SolicitudSistema, include: [Sistema] },
                { model: Area },
                { model: EstadoSolicitud, as: 'tbl_estado_solicitud' }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(list);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
});

/**
 * Crear Nueva Solicitud (Alta o Baja) con archivo opcional
 */
router.post('/', upload.single('archivo'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { tipo, usuario_objetivo_nombre, usuario_objetivo_dni_ruc, cargo, id_area, id_creado_por, sistemas } = req.body;

        // Parsear sistemas si vienen como string (FormData envía strings)
        const sistemasParsed = typeof sistemas === 'string' ? JSON.parse(sistemas) : sistemas;

        const nuevaSolicitud = await Solicitud.create({
            tipo,
            usuario_objetivo_nombre,
            usuario_objetivo_dni_ruc,
            cargo,
            id_area,
            id_creado_por,
            id_estado_solicitud: 1, // Pendiente
            archivo_sustento: req.file ? req.file.path : null
        }, { transaction: t });

        // Crear detalles de sistemas
        const detalles = sistemasParsed.map(s => ({
            id_solicitud: nuevaSolicitud.id_solicitud,
            id_sistema: s.id_sistema,
            detalle: s.detalle,
            estado_atencion: 'PENDIENTE'
        }));

        await SolicitudSistema.bulkCreate(detalles, { transaction: t });

        await t.commit();
        res.status(201).json(nuevaSolicitud);
    } catch (error) {
        await t.rollback();
        console.error(error);
        res.status(500).json({ error: 'Error al crear la solicitud' });
    }
});

/**
 * Actualizar una solicitud (Persistencia completa de sistemas)
 */
router.put('/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const {
            usuarioObjetivoNombre,
            usuarioObjetivoDniRuc,
            cargo: cargoFront,
            oficinaId,
            id_estado_solicitud: nextEstadoId,
            motivo_observacion: motivoFront,
            sistemas
        } = req.body;

        const solicitud = await Solicitud.findByPk(id, {
            include: [{ model: EstadoSolicitud, as: 'tbl_estado_solicitud' }]
        });

        if (!solicitud) {
            await t.rollback();
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // --- VALIDACIÓN DE TRANSICIÓN DE ESTADOS (MÁQUINA DE ESTADOS) ---
        if (nextEstadoId && parseInt(nextEstadoId) !== solicitud.id_estado_solicitud) {
            const currentEstado = solicitud.tbl_estado_solicitud?.nombre || 'PENDIENTE_OGA';
            const nextId = parseInt(nextEstadoId);

            // Reglas de negocio (4 áreas):
            // 1 (PENDIENTE_OGA) -> 2 (EN_PROCESO_USEI) : USEI recibe
            // 2 (EN_PROCESO_USEI) -> 4 (PARA_VALIDAR) : ETIC completa checklist y envía a Jefatura
            // 4 (PARA_VALIDAR) -> 5 (COMPLETADO) : Jefatura aprueba
            // CUALQUIERA -> 6 (OBSERVADO) : Devolución por USEI/ETIC/Jefe
            // 6 (OBSERVADO) -> 1 (PENDIENTE_OGA) : OGA corrige
            // 1 (PENDIENTE_OGA) -> 7 (ANULADO) : OGA cancela

            const allowedTransitions = {
                1: [2, 6, 7], // OGA puede ir a USEI, ser Observado o Anulado
                2: [3, 4, 6], // USEI puede ir a ETIC (opcional), PARA_VALIDAR (directo), u Observado
                3: [4, 6],    // ETIC puede ir a Validación u Observado
                4: [5, 6],    // Jefatura puede ir a Completado u Observado
                6: [1, 7]     // Observado vuelve a OGA para corregir o ser Anulado
            };

            if (allowedTransitions[solicitud.id_estado_solicitud] &&
                !allowedTransitions[solicitud.id_estado_solicitud].includes(nextId)) {
                await t.rollback();
                return res.status(400).json({
                    error: `Transición no permitida: ${currentEstado} no puede pasar al estado solicitado (ID: ${nextId}).`
                });
            }
        }

        // 1. Actualizar campos básicos
        await solicitud.update({
            id_estado_solicitud: nextEstadoId || solicitud.id_estado_solicitud,
            motivo_observacion: motivoFront !== undefined ? motivoFront : solicitud.motivo_observacion,
            usuario_objetivo_nombre: usuarioObjetivoNombre || solicitud.usuario_objetivo_nombre,
            usuario_objetivo_dni_ruc: usuarioObjetivoDniRuc || solicitud.usuario_objetivo_dni_ruc,
            cargo: cargoFront || solicitud.cargo,
            id_area: oficinaId || solicitud.id_area
        }, { transaction: t });

        // 2. Si vienen sistemas, sincronizarlos (Borrar y re-crear)
        if (sistemas) {
            const sistemasParsed = typeof sistemas === 'string' ? JSON.parse(sistemas) : sistemas;

            // Borrar sistemas previos
            await SolicitudSistema.destroy({
                where: { id_solicitud: id },
                transaction: t
            });

            // Re-crear nuevos
            if (Array.isArray(sistemasParsed) && sistemasParsed.length > 0) {
                const nuevosSistemas = sistemasParsed.map(s => ({
                    id_solicitud: id,
                    id_sistema: s.id_sistema || s.sistemaId, // Soportar ambos formatos si vienen del front
                    detalle: s.detalle,
                    estado_atencion: s.estado_atencion || s.estadoAtencion || 'PENDIENTE'
                }));
                await SolicitudSistema.bulkCreate(nuevosSistemas, { transaction: t });
            }
        }

        await t.commit();

        // Retornar la solicitud actualizada con sus sistemas
        const actualizada = await Solicitud.findByPk(id, {
            include: [
                { model: SolicitudSistema, include: [Sistema] },
                { model: EstadoSolicitud, as: 'tbl_estado_solicitud' }
            ]
        });

        res.json(actualizada);
    } catch (error) {
        await t.rollback();
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar solicitud' });
    }
});

/**
 * Marcar sistema como completado en una solicitud
 */
router.put('/:id/sistemas/:sistemaId', async (req, res) => {
    try {
        const { id, sistemaId } = req.params;
        const { estado_atencion } = req.body;

        const solSis = await SolicitudSistema.findOne({
            where: { id_solicitud: id, id_sistema: sistemaId }
        });

        if (!solSis) return res.status(404).json({ error: 'Sistema no encontrado en esta solicitud' });

        await solSis.update({
            estado_atencion: estado_atencion || 'COMPLETADO'
        });

        // Retornar la solicitud completa actualizada
        const updatedSolicitud = await Solicitud.findByPk(id, {
            include: [
                { model: SolicitudSistema, include: [Sistema] },
                { model: EstadoSolicitud, as: 'tbl_estado_solicitud' }
            ]
        });

        res.json(updatedSolicitud);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar sistema' });
    }
});

/**
 * Aprobar solicitud (Jefatura)
 * Sincroniza sistemas con el usuario objetivo
 */
router.post('/:id/aprobar', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const solicitud = await Solicitud.findByPk(id, {
            include: [{ model: SolicitudSistema }]
        });

        if (!solicitud) {
            await t.rollback();
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // 1. Buscar o crear la Persona y el Usuario objetivo
        const Usuario = require('../models/usuario');
        const Persona = require('../models/persona');
        const UsuarioSistema = require('../models/usuarioSistema');

        let [persona] = await Persona.findOrCreate({
            where: { documento: solicitud.usuario_objetivo_dni_ruc },
            defaults: {
                nombre: solicitud.usuario_objetivo_nombre,
                cargo: solicitud.cargo
            },
            transaction: t
        });

        let [usuario, created] = await Usuario.findOrCreate({
            where: { id_persona: persona.id_persona },
            defaults: {
                usuario: persona.documento, // De forma predeterminada el DNI es el usuario
                id_area: solicitud.id_area,
                id_rol: 0, // Rol genérico de personal
                id_estado: 8 // ACTIVO
            },
            transaction: t
        });

        // 2. Si el usuario es nuevo, asignar sistemas por defecto
        if (created) {
            // Asegurar que existan los sistemas por defecto
            const defaultCodes = ['CORREO', 'STD', 'USB'];
            const defaultNames = ['Correo Institucional', 'Sistema de Trámite Documentario', 'Bloqueo de USB'];

            for (let i = 0; i < defaultCodes.length; i++) {
                const [sis] = await Sistema.findOrCreate({
                    where: { codigo: defaultCodes[i] },
                    defaults: {
                        nombre: defaultNames[i],
                        requiere_detalle: defaultCodes[i] === 'CORREO'
                    },
                    transaction: t
                });

                await UsuarioSistema.findOrCreate({
                    where: { id_usuario: usuario.id_usuario, id_sistema: sis.id_sistema },
                    defaults: { id_estado_acceso: 1 },
                    transaction: t
                });
            }
        }

        // 3. Procesar los sistemas de la solicitud
        if (solicitud.tbl_solicitud_sistemas && solicitud.tbl_solicitud_sistemas.length > 0) {
            for (const solSis of solicitud.tbl_solicitud_sistemas) {
                if (solicitud.tipo === 'ALTA' || solicitud.tipo === 'MODIFICACION') {
                    // Activar o registrar sistema
                    await UsuarioSistema.upsert({
                        id_usuario: usuario.id_usuario,
                        id_sistema: solSis.id_sistema,
                        id_estado_acceso: 1
                    }, { transaction: t });
                } else if (solicitud.tipo === 'BAJA') {
                    // Revocar acceso (Cambiar a 0)
                    await UsuarioSistema.update(
                        { id_estado_acceso: 0 },
                        {
                            where: { id_usuario: usuario.id_usuario, id_sistema: solSis.id_sistema },
                            transaction: t
                        }
                    );
                }
            }
        }

        // 4. Finalizar solicitud
        await solicitud.update({ id_estado_solicitud: 5 }, { transaction: t }); // 5: COMPLETADO

        await t.commit();
        res.json({ message: 'Solicitud aprobada y sistemas sincronizados', solicitud });
    } catch (error) {
        await t.rollback();
        console.error(error);
        res.status(500).json({ error: 'Error al aprobar solicitud' });
    }
});

/**
 * Rechazar/Observar solicitud (Jefatura o ETIC)
 */
router.post('/:id/rechazar', async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const solicitud = await Solicitud.findByPk(id);
        if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });

        await solicitud.update({
            id_estado_solicitud: 6, // 6: OBSERVADO
            motivo_observacion: motivo || 'Observado durante el proceso'
        });
        res.json({ message: 'Solicitud observada/devuelta', solicitud });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al rechazar solicitud' });
    }
});

module.exports = router;
