<?php
$host = getenv('DB_HOST') ?: getenv('MYSQL_HOST') ?: '127.0.0.1';
$dbname = getenv('DB_NAME') ?: getenv('MYSQL_DATABASE') ?: 'db_reservas_aulas';
$dbuser = getenv('DB_USER') ?: getenv('MYSQL_USER') ?: 'root';
$dbpass = getenv('DB_PASS') ?: getenv('MYSQL_PASSWORD') ?: '';
$dbport = getenv('DB_PORT') ?: getenv('MYSQL_PORT') ?: '3306';

function ensureDatabaseExists(string $host, string $port, string $user, string $pass, string $dbname): void
{
    $dsn = 'mysql:host=' . $host . ';port=' . $port . ';charset=utf8mb4';
    $connection = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $safeDatabase = str_replace('`', '``', $dbname);
    $connection->exec('CREATE DATABASE IF NOT EXISTS `' . $safeDatabase . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
}

function ensureColumnExists(PDO $pdo, string $table, string $column, string $definition): void
{
    $escapedColumn = str_replace("'", "\\'", $column);
    $check = $pdo->query('SHOW COLUMNS FROM `' . str_replace('`', '``', $table) . '` LIKE \'' . $escapedColumn . '\'');
    if ($check === false || $check->fetch() === false) {
        $pdo->exec('ALTER TABLE `' . str_replace('`', '``', $table) . '` ADD COLUMN `' . str_replace('`', '``', $column) . '` ' . $definition);
    }
}

function ensureAppSchema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS roles (
            id_rol INT AUTO_INCREMENT PRIMARY KEY,
            nombre_rol VARCHAR(50) NOT NULL UNIQUE
        ) ENGINE=InnoDB'
    );

    $pdo->exec(
        'INSERT INTO roles (id_rol, nombre_rol)
         VALUES (1, "Superadministrador"), (2, "Profesor")
         ON DUPLICATE KEY UPDATE nombre_rol = VALUES(nombre_rol)'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS usuarios (
            id_usuario INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            apellido VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            id_rol INT NOT NULL,
            estado ENUM("Activo", "Inactivo") DEFAULT "Activo",
            cargo VARCHAR(100) NULL,
            area VARCHAR(100) NULL,
            cc VARCHAR(50) NULL,
            avatar VARCHAR(255) NULL DEFAULT "img/default-avatar.svg",
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_usuarios_roles FOREIGN KEY (id_rol) REFERENCES roles(id_rol) ON DELETE RESTRICT ON UPDATE CASCADE
        ) ENGINE=InnoDB'
    );

    ensureColumnExists($pdo, 'usuarios', 'cargo', 'VARCHAR(100) NULL');
    ensureColumnExists($pdo, 'usuarios', 'area', 'VARCHAR(100) NULL');
    ensureColumnExists($pdo, 'usuarios', 'cc', 'VARCHAR(50) NULL');
    ensureColumnExists($pdo, 'usuarios', 'avatar', 'VARCHAR(255) NULL DEFAULT "img/default-avatar.svg"');
    ensureColumnExists($pdo, 'usuarios', 'fecha_creacion', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS aulas (
            id_aula INT AUTO_INCREMENT PRIMARY KEY,
            codigo_aula VARCHAR(20) NOT NULL UNIQUE,
            nombre_aula VARCHAR(100) NOT NULL,
            capacidad INT NOT NULL,
            equipamiento TEXT NULL,
            estado ENUM("Activo", "Inactivo", "Mantenimiento") DEFAULT "Activo",
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS horarios_docentes (
            id_horario INT AUTO_INCREMENT PRIMARY KEY,
            id_usuario INT NOT NULL,
            id_aula INT NOT NULL,
            dia_semana ENUM("Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado") NOT NULL,
            hora_inicio TIME NOT NULL,
            hora_fin TIME NOT NULL,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_horarios_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_horarios_aulas FOREIGN KEY (id_aula) REFERENCES aulas(id_aula) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS configuracion_reservas (
            id_configuracion INT AUTO_INCREMENT PRIMARY KEY,
            clave VARCHAR(100) NOT NULL UNIQUE,
            valor VARCHAR(255) NOT NULL,
            descripcion TEXT NULL,
            activo TINYINT(1) NOT NULL DEFAULT 1,
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS excepciones_reservas (
            id_excepcion INT AUTO_INCREMENT PRIMARY KEY,
            fecha DATE NOT NULL,
            hora_inicio TIME NULL,
            hora_fin TIME NULL,
            motivo VARCHAR(255) NOT NULL,
            permitido TINYINT(1) NOT NULL DEFAULT 1,
            creado_por INT NULL,
            activo TINYINT(1) NOT NULL DEFAULT 1,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_excepcion_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE,
            UNIQUE KEY uq_excepcion_fecha (fecha, hora_inicio, hora_fin)
        ) ENGINE=InnoDB'
    );

    $pdo->exec(
        'INSERT INTO configuracion_reservas (clave, valor, descripcion, activo)
         VALUES
            ("jornada_inicio", "06:00", "Inicio permitido de la jornada institucional.", 1),
            ("jornada_fin", "18:00", "Cierre permitido de la jornada institucional.", 1),
            ("dias_normales", "Lunes,Martes,Miércoles,Jueves,Viernes", "Días laborables por defecto.", 1),
            ("reservas_activas", "1", "Habilita la validación institucional de horarios y días.", 1)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor), descripcion = VALUES(descripcion), activo = VALUES(activo)'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS reservas (
            id_reserva INT AUTO_INCREMENT PRIMARY KEY,
            id_usuario INT NOT NULL,
            id_aula INT NOT NULL,
            fecha_reserva DATE NOT NULL,
            hora_inicio TIME NOT NULL,
            hora_fin TIME NOT NULL,
            motivo TEXT NULL,
            estado ENUM("Pendiente", "Aprobada", "Rechazada", "Cancelada") DEFAULT "Pendiente",
            id_admin_gestion INT NULL,
            fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_reservas_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_reservas_aulas FOREIGN KEY (id_aula) REFERENCES aulas(id_aula) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_reservas_admin FOREIGN KEY (id_admin_gestion) REFERENCES usuarios(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT chk_reservas_horario CHECK (hora_fin > hora_inicio)
        ) ENGINE=InnoDB'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS historial_reservas (
            id_historial INT AUTO_INCREMENT PRIMARY KEY,
            id_reserva INT NOT NULL,
            id_usuario_accion INT NOT NULL,
            accion_realizada VARCHAR(100) NOT NULL,
            estado_anterior ENUM("Pendiente", "Aprobada", "Rechazada", "Cancelada") NULL,
            estado_nuevo ENUM("Pendiente", "Aprobada", "Rechazada", "Cancelada") NOT NULL,
            observaciones TEXT NULL,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_historial_reservas FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_historial_usuarios FOREIGN KEY (id_usuario_accion) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS bitacora_actividad (
            id_log INT AUTO_INCREMENT PRIMARY KEY,
            id_usuario INT NOT NULL,
            nombre_usuario VARCHAR(200) NOT NULL,
            rol_usuario VARCHAR(50) NOT NULL,
            tipo VARCHAR(80) NOT NULL,
            accion VARCHAR(150) NOT NULL,
            descripcion TEXT NOT NULL,
            entidad VARCHAR(80) NULL,
            entidad_id INT NULL,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_bitacora_actividad_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
            INDEX idx_bitacora_usuario (id_usuario),
            INDEX idx_bitacora_fecha (fecha_registro)
        ) ENGINE=InnoDB'
    );

    $countUsuarios = (int) $pdo->query('SELECT COUNT(*) FROM usuarios')->fetchColumn();
    if ($countUsuarios === 0) {
        $passwordAdmin = '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6';
        $pdo->exec(
            'INSERT INTO usuarios (nombre, apellido, email, password, id_rol, estado, cargo, area, cc, avatar)
             VALUES ("Admin", "Sistema", "admin@sistema.com", "' . $passwordAdmin . '", 1, "Activo", NULL, NULL, NULL, "img/default-avatar.svg")'
        );
    }
}

try {
    ensureDatabaseExists($host, $dbport, $dbuser, $dbpass, $dbname);

    $pdo = new PDO(
        'mysql:host=' . $host . ';port=' . $dbport . ';dbname=' . $dbname . ';charset=utf8mb4',
        $dbuser,
        $dbpass,
        [
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    ensureAppSchema($pdo);
} catch (PDOException $e) {
    die('Error de conexión a la base de datos: ' . $e->getMessage());
}
