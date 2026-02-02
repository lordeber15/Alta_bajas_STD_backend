const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Solicitud = require('../models/solicitud');
const SolicitudSistema = require('../models/solicitudSistema');
const Persona = require('../models/persona');
const Area = require('../models/area');
const Sistema = require('../models/sistema');
const sequelize = require('../config/database');

// Relaciones (Si no están definidas globalmente)
Solicitud.belongsTo(Area, { foreignKey: 'id_area' });
Area.hasMany(Solicitud, { foreignKey: 'id_area' });

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
                { model: Area }
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
            id_estado_solicitud: estadoId,
            motivo_observacion: motivoFront,
            sistemas
        } = req.body;

        const solicitud = await Solicitud.findByPk(id);
        if (!solicitud) {
            await t.rollback();
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // 1. Actualizar campos básicos
        await solicitud.update({
            id_estado_solicitud: estadoId || solicitud.id_estado_solicitud,
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
            include: [{ model: SolicitudSistema, include: [Sistema] }]
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
                { model: SolicitudSistema, include: [Sistema] }
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
 */
router.post('/:id/aprobar', async (req, res) => {
    try {
        const { id } = req.params;
        const solicitud = await Solicitud.findByPk(id);
        if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });

        await solicitud.update({ id_estado_solicitud: 4 }); // 4: Completado
        res.json({ message: 'Solicitud aprobada', solicitud });
    } catch (error) {
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
            id_estado_solicitud: 5, // 5: Observado
            motivo_observacion: motivo || 'Observado por Jefatura'
        });
        res.json({ message: 'Solicitud rechazada', solicitud });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al rechazar solicitud' });
    }
});

module.exports = router;
