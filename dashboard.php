<?php
session_start();

if (!isset($_SESSION['id_usuario']) && !isset($_SESSION['usuario_id'])) {
    header('Location: login/index.php');
    exit;
}

require_once __DIR__ . '/config/rbac.php';
require_once __DIR__ . '/config/logs.php';

$rolActual = currentUserRole();
if ($rolActual === 'Superadministrador') {
    header('Location: admin/panel_admin.php');
    exit;
}

require_once __DIR__ . '/config/conexion.php';

$idUsuario = $_SESSION['id_usuario'] ?? $_SESSION['usuario_id'];
$ensureUserColumns = function ($pdo) {
    $columns = ['cargo', 'area', 'cc', 'avatar'];
    foreach ($columns as $column) {
        $stmt = $pdo->query("SHOW COLUMNS FROM usuarios LIKE '$column'");
        if ($stmt->fetch() === false) {
            $sql = match ($column) {
                'cargo' => 'ALTER TABLE usuarios ADD COLUMN cargo VARCHAR(120) NULL AFTER estado',
                'area' => 'ALTER TABLE usuarios ADD COLUMN area VARCHAR(120) NULL AFTER cargo',
                'cc' => 'ALTER TABLE usuarios ADD COLUMN cc VARCHAR(30) NULL AFTER area',
                'avatar' => 'ALTER TABLE usuarios ADD COLUMN avatar VARCHAR(255) NULL DEFAULT "img/default-avatar.svg" AFTER cc',
            };
            $pdo->exec($sql);
        }
    }
};

$ensureUserColumns($pdo);

$stmt = $pdo->prepare(
    'SELECT u.nombre, u.apellido, u.email, u.estado, u.cargo, u.area, u.cc, u.avatar, r.nombre_rol AS rol
     FROM usuarios u
     INNER JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = :id_usuario
     LIMIT 1'
);
$stmt->execute([':id_usuario' => (int) $idUsuario]);
$user = $stmt->fetch();

if (!$user) {
    session_unset();
    session_destroy();
    header('Location: login/index.php');
    exit;
}

$nombreCompleto = trim((string) ($user['nombre'] ?? '')) . ' ' . trim((string) ($user['apellido'] ?? ''));
$nombreCompleto = trim($nombreCompleto) ?: 'Usuario';
$avatar = trim((string) ($user['avatar'] ?? '')) !== '' ? $user['avatar'] : 'img/default-avatar.svg';
$rolUsuario = normalizeRole((string) ($user['rol'] ?? $_SESSION['rol'] ?? $_SESSION['usuario_rol'] ?? 'Profesor'));
$roleLabel = $rolUsuario === 'Superadministrador' ? 'Administrador' : 'Profesor';

if ($rolUsuario === 'Superadministrador') {
    $menuItems = [
        ['icon' => 'bi-house-door', 'label' => 'Inicio', 'href' => 'dashboard.php', 'active' => true, 'visible' => true],
        ['icon' => 'bi-calendar3', 'label' => 'Reservas', 'href' => 'reservas/consultar.php', 'active' => false, 'visible' => true],
        ['icon' => 'bi-building', 'label' => 'Aulas', 'href' => 'aulas/gestionar_aula.php', 'active' => false, 'visible' => true],
        ['icon' => 'bi-clock-history', 'label' => 'Horarios', 'href' => 'horarios/cargar_horario.php', 'active' => false, 'visible' => true],
        ['icon' => 'bi-people', 'label' => 'Usuarios', 'href' => 'admin/gestionar_usuarios.php', 'active' => false, 'visible' => true],
        ['icon' => 'bi-graph-up-arrow', 'label' => 'Reportes', 'href' => 'reportes/index.php', 'active' => false, 'visible' => true],
        ['icon' => 'bi-gear', 'label' => 'Perfil', 'href' => '#perfil', 'active' => false, 'visible' => true],
        ['icon' => 'bi-shield-lock', 'label' => 'Actividad de login', 'href' => 'actividad_login.php', 'active' => false, 'visible' => true],
    ];
} else {
    $menuItems = [
        ['icon' => 'bi-house-door', 'label' => 'Inicio', 'href' => 'dashboard.php', 'active' => true, 'visible' => true],
        ['icon' => 'bi-calendar3', 'label' => 'Mis reservas', 'href' => 'reservas/mis_reservas.php', 'active' => false, 'visible' => true],
        ['icon' => 'bi-building', 'label' => 'Aulas', 'href' => 'aulas/gestionar_aula.php', 'active' => false, 'visible' => true],
        ['icon' => 'bi-clock-history', 'label' => 'Horarios', 'href' => 'horarios/cargar_horario.php', 'active' => false, 'visible' => true],
        ['icon' => 'bi-gear', 'label' => 'Perfil', 'href' => '#perfil', 'active' => false, 'visible' => true],
        ['icon' => 'bi-shield-lock', 'label' => 'Actividad de login', 'href' => 'actividad_login.php', 'active' => false, 'visible' => true],
    ];
}

$rbacAlert = $_SESSION['rbac_error'] ?? null;
unset($_SESSION['rbac_error']);
$rbacSuccess = $_SESSION['rbac_success'] ?? null;
unset($_SESSION['rbac_success']);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Dashboard institucional</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <link rel="stylesheet" href="css/estilos.css">
</head>
<body class="dashboard-body">
    <?php if ($rbacAlert): ?>
        <div class="rbac-banner is-error"><?= htmlspecialchars($rbacAlert); ?></div>
    <?php elseif ($rbacSuccess): ?>
        <div class="rbac-banner is-success"><?= htmlspecialchars($rbacSuccess); ?></div>
    <?php endif; ?>
    <a class="skip-link" href="#main-content">Saltar al contenido principal</a>
    <div class="dashboard-shell">
        <aside class="dashboard-sidebar" id="sidebarMenu" aria-label="Menú principal" aria-expanded="true">
            <div class="sidebar-header-row">
                <div class="sidebar-brand">
                    <img src="img/logo-institucion.png" alt="Logo institucional">
                    <div>
                        <strong>ITEJABB</strong>
                        <span>Campus</span>
                    </div>
                </div>
                <button type="button" class="sidebar-collapse-button" id="sidebarToggle" aria-label="Ocultar menú" aria-expanded="true">
                    <i class="bi bi-chevron-left"></i>
                </button>
            </div>

            <div class="profile-summary">
                <div class="profile-avatar">
                    <img src="<?= htmlspecialchars($avatar, ENT_QUOTES, 'UTF-8'); ?>" alt="Foto de perfil">
                </div>
                <div>
                    <h3><?= htmlspecialchars($nombreCompleto); ?></h3>
                    <p><?= htmlspecialchars($roleLabel); ?></p>
                </div>
            </div>

            <nav class="dashboard-nav" aria-label="Navegación principal">
                <?php foreach ($menuItems as $item): ?>
                    <?php if (!$item['visible']) continue; ?>
                    <a href="<?= htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8'); ?>" class="nav-link <?= $item['active'] ? 'is-active' : ''; ?>">
                        <i class="bi <?= $item['icon']; ?>"></i>
                        <span><?= htmlspecialchars($item['label']); ?></span>
                    </a>
                <?php endforeach; ?>
            </nav>

            <div class="sidebar-footer">
                <a href="login/logout.php" class="logout-button">
                    <i class="bi bi-box-arrow-right"></i>
                    Cerrar sesión
                </a>
            </div>
        </aside>

        <main class="dashboard-main" id="main-content">
            <header class="dashboard-topbar">
                <div class="topbar-left">
                    <div class="search-box" role="search">
                        <i class="bi bi-search"></i>
                        <input type="search" placeholder="Buscar..." aria-label="Buscar dentro del panel">
                    </div>
                </div>

                <div class="topbar-actions">
                    <button type="button" class="icon-button" aria-label="Notificaciones">
                        <i class="bi bi-bell"></i>
                    </button>
                    <button type="button" class="icon-button" aria-label="Mensajes">
                        <i class="bi bi-chat-left-text"></i>
                    </button>
                    <div class="mini-user">
                        <img src="<?= htmlspecialchars($avatar, ENT_QUOTES, 'UTF-8'); ?>" alt="Usuario activo">
                        <span><?= htmlspecialchars($nombreCompleto); ?></span>
                    </div>
                </div>
            </header>

            <section class="hero-dashboard">
                <div>
                    <p class="eyebrow">Bienvenido</p>
                    <h1>Tu espacio institucional</h1>
                </div>
                <div class="hero-pill">
                    <span class="status-dot"></span>
                    <?= htmlspecialchars($user['estado'] ?? 'Activo'); ?>
                </div>
            </section>

            <section class="stats-grid">
                <article class="stat-card primary">
                    <span>Reservas</span>
                    <strong>
                        <?php
                        $reservaTotal = $pdo->query('SELECT COUNT(*) FROM reservas WHERE id_usuario = ' . (int) $idUsuario)->fetchColumn();
                        echo (int) $reservaTotal;
                        ?>
                    </strong>
                </article>
                <article class="stat-card accent">
                    <span>Aprobadas</span>
                    <strong>
                        <?php
                        $reservaAprobadas = $pdo->query('SELECT COUNT(*) FROM reservas WHERE id_usuario = ' . (int) $idUsuario . ' AND estado = "Aprobada"')->fetchColumn();
                        echo (int) $reservaAprobadas;
                        ?>
                    </strong>
                </article>
                <article class="stat-card soft">
                    <span>Pendientes</span>
                    <strong>
                        <?php
                        $reservaPendientes = $pdo->query('SELECT COUNT(*) FROM reservas WHERE id_usuario = ' . (int) $idUsuario . ' AND estado = "Pendiente"')->fetchColumn();
                        echo (int) $reservaPendientes;
                        ?>
                    </strong>
                </article>
            </section>

            <section class="content-grid">
                <article class="panel-card">
                    <div class="panel-header">
                        <h2>Resumen</h2>
                        <a href="reservas/crear_reserva.php">Nueva reserva</a>
                    </div>

                    <div class="summary-list">
                        <div class="summary-item">
                            <span class="item-icon"><i class="bi bi-building"></i></span>
                            <div>
                                <strong>Campus</strong>
                                <small>Multisede institucional</small>
                            </div>
                        </div>
                        <div class="summary-item">
                            <span class="item-icon"><i class="bi bi-calendar-check"></i></span>
                            <div>
                                <strong>Disponibilidad</strong>
                                <small>Gestión rápida por horarios</small>
                            </div>
                        </div>
                        <div class="summary-item">
                            <span class="item-icon"><i class="bi bi-person-check"></i></span>
                            <div>
                                <strong>Perfil</strong>
                                <small>Actualiza tus datos y foto</small>
                            </div>
                        </div>
                    </div>
                </article>

                <?php
                $profileUser = $user;
                $profileAvatar = $avatar;
                $profileFormAction = 'usuarios/procesar_perfil.php';
                require __DIR__ . '/includes/perfil_form.php';
                ?>
            </section>
        </main>
    </div>
    <script src="js/main.js"></script>
</body>
</html>
