const express = require('express');
const router = express.Router();
const Sistema = require('../models/sistema');

/**
 * Obtener todos los sistemas (Catálogo)
 */
router.get('/', async (req, res) => {
    try {
        const sistemas = await Sistema.findAll();
        res.json(sistemas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener sistemas' });
    }
});

/**
 * Crear un nuevo sistema (Administración Jefatura)
 */
router.post('/', async (req, res) => {
    try {
        const nuevoSistema = await Sistema.create(req.body);
        res.status(201).json(nuevoSistema);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear el sistema' });
    }
});

/**
 * Actualizar un sistema
 */
router.put('/:id', async (req, res) => {
    try {
        const [updated] = await Sistema.update(req.body, {
            where: { id_sistema: req.params.id }
        });
        if (updated) {
            const sistema = await Sistema.findByPk(req.params.id);
            return res.json(sistema);
        }
        throw new Error('Sistema no encontrado');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el sistema' });
    }
});

module.exports = router;
