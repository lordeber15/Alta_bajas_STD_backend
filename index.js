const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sequelize = require('./config/database');
const path = require('path');

// Importar Modelos para asegurar que se registren en Sequelize
const Persona = require('./models/persona');
const Area = require('./models/area');
const Usuario = require('./models/usuario');
const Sistema = require('./models/sistema');
const Solicitud = require('./models/solicitud');
const SolicitudSistema = require('./models/solicitudSistema');
const UsuarioSistema = require('./models/usuarioSistema');

// Importar Rutas
const personalRoutes = require('./routes/personal');
const areaRoutes = require('./routes/areas');
const sistemaRoutes = require('./routes/sistemas');
const solicitudRoutes = require('./routes/solicitudes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas
app.use('/api/personal', personalRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/sistemas', sistemaRoutes);
app.use('/api/solicitudes', solicitudRoutes);

// Probar conexión y arrancar servidor
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('--- Conexión a la base de datos establecida correctamente. ---');

        // Sincronizar modelos (solo crea tablas si no existen)
        await sequelize.sync();
        console.log('--- Modelos sincronizados con la base de datos. ---');

        app.listen(PORT, () => {
            console.log(`--- Servidor Node.js corriendo en el puerto ${PORT} ---`);
        });
    } catch (error) {
        console.error('--- No se pudo conectar a la base de datos: ---', error);
    }
}

startServer();
