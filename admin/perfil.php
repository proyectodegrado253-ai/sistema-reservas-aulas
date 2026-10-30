<?php
session_start();
require_once '../config/rbac.php';

if (!isset($_SESSION['id_usuario']) && !isset($_SESSION['usuario_id'])) {
    session_unset();
    session_destroy();
    header('Location: ../login/index.php');
    exit;
}

if (normalizeRole(currentUserRole()) !== 'Superadministrador') {
    session_unset();
    session_destroy();
    header('Location: ../login/index.php?error=acceso_denegado');
    exit;
}

require_once '../config/conexion.php';

$idUsuarioActual = (int) ($_SESSION['id_usuario'] ?? $_SESSION['usuario_id'] ?? 0);
$stmtPerfil = $pdo->prepare('SELECT nombre, apellido, email, cargo, area, cc, avatar FROM usuarios WHERE id_usuario = :id_usuario LIMIT 1');
$stmtPerfil->execute([':id_usuario' => $idUsuarioActual]);
$perfilUsuario = $stmtPerfil->fetch(PDO::FETCH_ASSOC) ?: null;

$usuarioSesion = $_SESSION['nombre'] ?? ($_SESSION['usuario_nombre'] ?? 'Usuario');
$rolSesion = normalizeRole((string) ($_SESSION['rol'] ?? $_SESSION['usuario_rol'] ?? 'Superadministrador'));
$avatarSesion = '../img/default-avatar.svg';
if (!empty($perfilUsuario['avatar'])) {
    $avatarSesion = '../' . ltrim((string) $perfilUsuario['avatar'], '/');
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Perfil del administrador</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../css/estilos.css">
</head>
<body class="dashboard-body">
    <button type="button" class="mobile-sidebar-toggle" id="mobileSidebarToggle" aria-label="Abrir menú" aria-expanded="false">
        <i class="bi bi-list"></i>
    </button>

    <div class="dashboard-shell">
        <aside class="dashboard-sidebar" id="sidebarMenu" aria-label="Menú principal" aria-expanded="true">
            <div class="sidebar-header-row">
                <div class="sidebar-brand">
                    <img src="../img/logo-institucion.png" alt="Logo institucional">
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
                    <img src="<?= htmlspecialchars($avatarSesion, ENT_QUOTES, 'UTF-8'); ?>" alt="Foto de perfil">
                </div>
                <div>
                    <h3><?= htmlspecialchars($usuarioSesion); ?></h3>
                    <p><?= htmlspecialchars($rolSesion === 'Superadministrador' ? 'Administrador' : 'Profesor'); ?></p>
                </div>
            </div>

            <nav class="dashboard-nav" aria-label="Navegación principal">
                <a href="../dashboard.php" class="nav-link"><i class="bi bi-house-door"></i><span>Inicio</span></a>
                <a href="gestionar_usuarios.php" class="nav-link"><i class="bi bi-people"></i><span>Usuarios</span></a>
                <a href="../aulas/gestionar_aula.php" class="nav-link"><i class="bi bi-building"></i><span>Aulas</span></a>
                <a href="../reservas/consultar.php" class="nav-link"><i class="bi bi-calendar3"></i><span>Reservas</span></a>
                <a href="../horarios/cargar_horario.php" class="nav-link"><i class="bi bi-clock-history"></i><span>Horarios</span></a>
                <a href="../reportes/index.php" class="nav-link"><i class="bi bi-graph-up-arrow"></i><span>Reportes</span></a>
                <a href="perfil.php" class="nav-link is-active"><i class="bi bi-person-circle"></i><span>Perfil</span></a>
            </nav>

            <div class="sidebar-footer">
                <a href="../login/logout.php" class="logout-button">
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
                    <button type="button" class="icon-button" data-panel="notifications" aria-label="Notificaciones">
                        <i class="bi bi-bell"></i>
                        <span class="panel-badge">3</span>
                    </button>
                    <button type="button" class="icon-button" data-panel="messages" aria-label="Mensajes">
                        <i class="bi bi-chat-left-text"></i>
                        <span class="panel-badge">2</span>
                    </button>
                </div>
            </header>

            <aside class="utility-panel" id="utilityPanel" aria-hidden="true">
                <div class="utility-panel-header">
                    <h3 id="utilityPanelTitle">Notificaciones</h3>
                    <button type="button" class="utility-panel-close" aria-label="Cerrar panel">Cerrar</button>
                </div>
                <div class="utility-panel-body" id="utilityPanelBody"></div>
            </aside>

            <section class="hero-dashboard">
                <div>
                    <p class="eyebrow">Administración</p>
                    <h1>Mi perfil</h1>
                </div>
                <div class="hero-pill">
                    <span class="status-dot"></span>
                    Configuración personal
                </div>
            </section>

            <section class="content-grid single-column">
                <?php
                $profileUser = $perfilUsuario;
                $profileAvatar = $avatarSesion;
                $profileFormAction = '../usuarios/procesar_perfil.php';
                require __DIR__ . '/../includes/perfil_form.php';
                ?>
            </section>
        </main>
    </div>

    <script src="../js/main.js"></script>
</body>
</html>
