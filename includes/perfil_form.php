<?php
$profileFormAction = $profileFormAction ?? 'usuarios/procesar_perfil.php';
$profileUser = $profileUser ?? ($user ?? $perfilUsuario ?? []);
$profileAvatar = $profileAvatar ?? ($avatar ?? ($perfilUsuario['avatar'] ?? 'img/default-avatar.svg'));
?>

<aside class="panel-card profile-panel" id="perfil">
    <div class="panel-header">
        <h2>Datos personales</h2>
    </div>

    <?php if (isset($_SESSION['perfil_error'])): ?>
        <div class="form-alert is-error"><?= htmlspecialchars((string) $_SESSION['perfil_error'], ENT_QUOTES, 'UTF-8'); ?></div>
        <?php unset($_SESSION['perfil_error']); ?>
    <?php endif; ?>

    <?php if (isset($_SESSION['perfil_exito'])): ?>
        <div class="form-alert is-success"><?= htmlspecialchars((string) $_SESSION['perfil_exito'], ENT_QUOTES, 'UTF-8'); ?></div>
        <?php unset($_SESSION['perfil_exito']); ?>
    <?php endif; ?>

    <form action="<?= htmlspecialchars((string) $profileFormAction, ENT_QUOTES, 'UTF-8'); ?>" method="POST" enctype="multipart/form-data" class="profile-form">
        <div class="avatar-upload-wrap">
            <div class="avatar-upload">
                <img id="avatarPreview" src="<?= htmlspecialchars((string) $profileAvatar, ENT_QUOTES, 'UTF-8'); ?>" alt="Avatar actual">
                <label class="upload-button" for="avatarInput">
                    <i class="bi bi-camera"></i>
                </label>
                <input id="avatarInput" type="file" name="avatar" accept="image/jpeg,image/png,image/webp,image/gif">
            </div>
        </div>
        <small class="avatar-recommendation">Recomendado: 400×400 px · JPG, PNG o WEBP</small>

        <div class="form-row two-col">
            <label class="field">
                <span>Nombre</span>
                <input type="text" name="nombre" value="<?= htmlspecialchars((string) ($profileUser['nombre'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" required>
            </label>
            <label class="field">
                <span>Apellido</span>
                <input type="text" name="apellido" value="<?= htmlspecialchars((string) ($profileUser['apellido'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" required>
            </label>
        </div>

        <label class="field">
            <span>Correo</span>
            <input type="email" name="email" value="<?= htmlspecialchars((string) ($profileUser['email'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" required>
        </label>

        <div class="form-row two-col">
            <label class="field">
                <span>Cargo</span>
                <select name="cargo">
                    <option value="">Selecciona</option>
                    <option value="Docente" <?= (($profileUser['cargo'] ?? '') === 'Docente') ? 'selected' : ''; ?>>Docente</option>
                    <option value="Coordinador" <?= (($profileUser['cargo'] ?? '') === 'Coordinador') ? 'selected' : ''; ?>>Coordinador</option>
                    <option value="Director" <?= (($profileUser['cargo'] ?? '') === 'Director') ? 'selected' : ''; ?>>Director</option>
                    <option value="Técnico" <?= (($profileUser['cargo'] ?? '') === 'Técnico') ? 'selected' : ''; ?>>Técnico</option>
                    <option value="Asistente" <?= (($profileUser['cargo'] ?? '') === 'Asistente') ? 'selected' : ''; ?>>Asistente</option>
                    <option value="Otro" <?= (($profileUser['cargo'] ?? '') === 'Otro') ? 'selected' : ''; ?>>Otro</option>
                </select>
            </label>
            <label class="field">
                <span>Área</span>
                <select name="area">
                    <option value="">Selecciona</option>
                    <option value="Informática" <?= (($profileUser['area'] ?? '') === 'Informática') ? 'selected' : ''; ?>>Informática</option>
                    <option value="Matemáticas" <?= (($profileUser['area'] ?? '') === 'Matemáticas') ? 'selected' : ''; ?>>Matemáticas</option>
                    <option value="Ciencias" <?= (($profileUser['area'] ?? '') === 'Ciencias') ? 'selected' : ''; ?>>Ciencias</option>
                    <option value="Humanidades" <?= (($profileUser['area'] ?? '') === 'Humanidades') ? 'selected' : ''; ?>>Humanidades</option>
                    <option value="Idiomas" <?= (($profileUser['area'] ?? '') === 'Idiomas') ? 'selected' : ''; ?>>Idiomas</option>
                    <option value="Administración" <?= (($profileUser['area'] ?? '') === 'Administración') ? 'selected' : ''; ?>>Administración</option>
                    <option value="Electrónica" <?= (($profileUser['area'] ?? '') === 'Electrónica') ? 'selected' : ''; ?>>Electrónica</option>
                    <option value="Otra" <?= (($profileUser['area'] ?? '') === 'Otra') ? 'selected' : ''; ?>>Otra</option>
                </select>
            </label>
        </div>

        <label class="field">
            <span>CC / documento</span>
            <input type="text" name="cc" value="<?= htmlspecialchars((string) ($profileUser['cc'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" placeholder="Opcional">
        </label>

        <button type="submit" class="btn btn-primary btn-block">Guardar cambios</button>
    </form>
</aside>
