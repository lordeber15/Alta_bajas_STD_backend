const sequelize = require('./config/database');

async function createTables() {
    try {
        await sequelize.authenticate();
        console.log('--- Auth OK ---');

        // 1. tbl_sistema
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`tbl_sistema\` (
        \`id_sistema\` int(10) unsigned NOT NULL AUTO_INCREMENT,
        \`nombre\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
        \`codigo\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
        \`aplica_alta\` tinyint(1) DEFAULT 1,
        \`aplica_baja\` tinyint(1) DEFAULT 1,
        \`requiere_detalle\` tinyint(1) DEFAULT 0,
        \`estado\` int(11) DEFAULT 1,
        \`createdAt\` datetime NOT NULL,
        \`updatedAt\` datetime NOT NULL,
        PRIMARY KEY (\`id_sistema\`),
        UNIQUE KEY \`codigo\` (\`codigo\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
    `);
        console.log('tbl_sistema OK');

        // 2. tbl_solicitud
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`tbl_solicitud\` (
        \`id_solicitud\` int(10) unsigned NOT NULL AUTO_INCREMENT,
        \`tipo\` enum('ALTA','BAJA') COLLATE utf8_unicode_ci NOT NULL,
        \`usuario_objetivo_nombre\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
        \`usuario_objetivo_dni_ruc\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
        \`cargo\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
        \`id_area\` int(10) unsigned NOT NULL,
        \`id_estado_solicitud\` int(11) DEFAULT 1,
        \`id_creado_por\` int(10) unsigned NOT NULL,
        \`motivo_observacion\` text COLLATE utf8_unicode_ci,
        \`archivo_sustento\` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
        \`createdAt\` datetime NOT NULL,
        \`updatedAt\` datetime NOT NULL,
        PRIMARY KEY (\`id_solicitud\`),
        KEY \`id_creado_por\` (\`id_creado_por\`),
        CONSTRAINT \`tbl_solicitud_ibfk_1\` FOREIGN KEY (\`id_creado_por\`) REFERENCES \`tbl_usuario\` (\`id_usuario\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
    `);
        console.log('tbl_solicitud OK');

        // 3. tbl_usuario_sistema
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`tbl_usuario_sistema\` (
        \`id_usuario_sistema\` int(10) unsigned NOT NULL AUTO_INCREMENT,
        \`id_usuario\` int(10) unsigned NOT NULL,
        \`id_sistema\` int(10) unsigned NOT NULL,
        \`id_estado_acceso\` int(11) DEFAULT 1,
        \`createdAt\` datetime NOT NULL,
        \`updatedAt\` datetime NOT NULL,
        PRIMARY KEY (\`id_usuario_sistema\`),
        KEY \`id_usuario\` (\`id_usuario\`),
        KEY \`id_sistema\` (\`id_sistema\`),
        CONSTRAINT \`tbl_usuario_sistema_ibfk_1\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`tbl_usuario\` (\`id_usuario\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`tbl_usuario_sistema_ibfk_2\` FOREIGN KEY (\`id_sistema\`) REFERENCES \`tbl_sistema\` (\`id_sistema\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
    `);
        console.log('tbl_usuario_sistema OK');

        // 4. tbl_solicitud_sistema
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`tbl_solicitud_sistema\` (
        \`id_solicitud_sistema\` int(10) unsigned NOT NULL AUTO_INCREMENT,
        \`id_solicitud\` int(10) unsigned NOT NULL,
        \`id_sistema\` int(10) unsigned NOT NULL,
        \`detalle\` text COLLATE utf8_unicode_ci,
        \`estado_atencion\` enum('PENDIENTE','COMPLETADO') COLLATE utf8_unicode_ci DEFAULT 'PENDIENTE',
        PRIMARY KEY (\`id_solicitud_sistema\`),
        KEY \`id_solicitud\` (\`id_solicitud\`),
        KEY \`id_sistema\` (\`id_sistema\`),
        CONSTRAINT \`tbl_solicitud_sistema_ibfk_1\` FOREIGN KEY (\`id_solicitud\`) REFERENCES \`tbl_solicitud\` (\`id_solicitud\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`tbl_solicitud_sistema_ibfk_2\` FOREIGN KEY (\`id_sistema\`) REFERENCES \`tbl_sistema\` (\`id_sistema\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
    `);
        console.log('tbl_solicitud_sistema OK');

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        process.exit();
    }
}

createTables();
