const Solicitud = require('./models/solicitud');
const EstadoSolicitud = require('./models/estadoSolicitud');
const sequelize = require('./config/database');

async function checkRequest34() {
    try {
        await sequelize.authenticate();
        console.log('--- Checking Request #34 ---');

        const sol = await Solicitud.findByPk(34, {
            include: [{ model: EstadoSolicitud, as: 'tbl_estado_solicitud' }]
        });

        if (!sol) {
            console.log('Request #34 not found');
            process.exit(1);
        }

        console.log('ID:', sol.id_solicitud);
        console.log('Usuario:', sol.usuario_objetivo_nombre);
        console.log('Estado ID:', sol.id_estado_solicitud);
        console.log('Estado Nombre:', sol.tbl_estado_solicitud?.nombre);
        console.log('Tipo:', sol.tipo);

        console.log('\n--- Allowed Transitions from State', sol.id_estado_solicitud, '---');
        const allowedTransitions = {
            1: [2, 6, 7], // OGA puede ir a USEI, ser Observado o Anulado
            2: [3, 6],    // USEI puede ir a ETIC u Observado
            3: [4, 6],    // ETIC puede ir a Validación u Observado
            4: [5, 6],    // Jefatura puede ir a Completado u Observado
            6: [1]        // Observado vuelve a OGA para corregir
        };

        console.log('Allowed next states:', allowedTransitions[sol.id_estado_solicitud]);
        console.log('Trying to go to state 4 (PARA_VALIDAR)');
        console.log('Is transition allowed?', allowedTransitions[sol.id_estado_solicitud]?.includes(4));

        process.exit(0);
    } catch (error) {
        console.error('--- Error ---');
        console.error(error);
        process.exit(1);
    }
}

checkRequest34();
