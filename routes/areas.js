const express = require('express');
const router = express.Router();
const Area = require('../models/area');
const { Op } = require('sequelize');

/**
 * Obtener todas las áreas (para selectores de oficina)
 * Excluye las marcadas como N/D
 */
router.get('/', async (req, res) => {
    try {
        const areas = await Area.findAll({
            where: {
                area: {
                    [Op.ne]: 'N/D'
                }
            }
        });
        res.json(areas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las áreas' });
    }
});

module.exports = router;
