const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario');
const Persona = require('../models/persona');
const Area = require('../models/area');
const UsuarioSistema = require('../models/usuarioSistema');
const Sistema = require('../models/sistema');

/**
 * Obtener todo el personal con su información de usuario y sistemas
 */
router.get('/', async (req, res) => {
    try {
        const list = await Usuario.findAll({
            include: [
                { model: Persona },
                { model: Area },
                {
                    model: UsuarioSistema,
                    where: { id_estado_acceso: 1 },
                    required: false,
                    include: [Sistema]
                }
            ]
        });
        res.json(list);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener personal' });
    }
});

module.exports = router;
