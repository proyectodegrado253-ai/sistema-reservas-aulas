--========================================================
-- Limpieza y carga de aulas reales + docentes asociados
--========================================================
-- Ajustado al esquema real del proyecto (MySQL / MariaDB):
--   - aulas
--   - usuarios
--   - horarios_docentes
--   - reservas
--
-- IMPORTANTE:
-- En este proyecto NO existen las tablas docentes ni aula_docentes.
-- La relación real entre docente y aula se guarda en horarios_docentes,
-- usando usuarios(id_usuario) + aulas(id_aula).
--========================================================

USE db_reservas_aulas;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM reservas;
DELETE FROM horarios_docentes;
DELETE FROM aulas;
DELETE FROM usuarios WHERE id_rol = 2;

SET FOREIGN_KEY_CHECKS = 1;

--========================================================
-- 1) AULAS REALES SEGÚN EL DOCUMENTO DE LA INSTITUCIÓN
--========================================================
INSERT INTO aulas (id_aula, codigo_aula, nombre_aula, capacidad, equipamiento, estado) VALUES
(1, 'A-101', 'AULA ESPECIALIZADA MATEMÁTICAS', 35, 'Material didáctico, pizarra, mobiliario académico', 'Activo'),
(2, 'A-102', 'AULA ESPECIALIZADA INFORMÁTICA', 30, 'Laboratorio de computación, equipos, red, proyector', 'Activo'),
(3, 'A-103', 'AULA ESPECIALIZADA INNOVACIÓN', 30, 'Espacio STEM, innovación pedagógica, equipos de trabajo', 'Activo'),
(4, 'A-104', 'PUNTO VIVE DIGITAL', 40, 'Centro tecnológico, TIC, investigación y acceso digital', 'Activo'),
(5, 'A-105', 'LABORATORIO DE BIOLOGÍA', 30, 'Material biológico, equipos de laboratorio, mobiliario técnico', 'Activo'),
(6, 'A-106', 'LABORATORIO DE QUÍMICA', 30, 'Reactivos, material experimental, infraestructura química', 'Activo'),
(7, 'A-107', 'LABORATORIO DE FÍSICA', 30, 'Equipos de experimentación, instrumentos físicos, mesa de trabajo', 'Activo'),
(8, 'A-108', 'SALÓN DE HUMANIDADES', 35, 'Espacio de lectura crítica, ciencias sociales y literatura', 'Activo'),
(9, 'A-109', 'BIBLIOTECA', 50, 'Área de consulta, lectura, investigación y material bibliográfico', 'Activo'),
(10, 'A-110', 'SALA DE SALUD', 25, 'Simulación clínica, mobiliario especializado y atención sanitaria', 'Activo'),
(11, 'A-111', 'SALA DE DISEÑO', 25, 'Espacio creativo, diseño gráfico y expresión visual', 'Activo'),
(12, 'A-112', 'SALA DE ARTE', 25, 'Taller artístico, dibujo, expresión plástica y material creativo', 'Activo');

--========================================================
-- 2) DOCENTES REALES ASOCIADOS A SUS AULAS
--    (Se insertan en usuarios con rol Profesor y luego se vinculan en horarios_docentes)
--========================================================
INSERT INTO usuarios (id_usuario, nombre, apellido, email, password, id_rol, estado, cargo, area) VALUES
(2001, 'CHARRIS', 'SARMIENTO YIRA PAULINA', 'charris.sarmiento@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Matemáticas'),
(2002, 'CRUZ', 'AMARANTO WENDY JULIETH', 'cruz.amaranto@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Matemáticas'),
(2003, 'MADURO', 'SILVERA MARGARITA DE JESUS', 'margarita.maduro@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Matemáticas'),
(2004, 'MUÑOZ', 'EBRATT RICARDO ALBERTO', 'ricardo.munoz@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Matemáticas'),
(2005, 'POLO', 'MERCADO MILENA PATRICIA', 'milena.polo@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Matemáticas'),
(2006, 'RODRIGUEZ', 'RUIZ RICARDO RAMON', 'ricardo.rodriguez@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Matemáticas'),
(2007, 'MARTES', 'BARRIOS ASTRID', 'astrid.martes@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Informática'),
(2008, 'SARMIENTO', 'ALVAREZ RUTH MERY', 'ruth.sarmiento@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Informática'),
(2009, 'NIEBLES', 'CARDENAS MANUEL JULIAN', 'manuel.niebles@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Innovación'),
(2010, 'REDONDO', 'GUTIERREZ HEIDY ESTHER', 'heidy.redondo@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Innovación'),
(2011, 'CUENTAS', 'PATIÑO MILAGRO DE JESUS', 'milagro.cuentas@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Punto Vive Digital'),
(2012, 'GARCÍA', 'MERCADO LUIS RICARDO', 'luis.garcia@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Punto Vive Digital'),
(2013, 'ALTAMAR', 'DE LA CRUZ HAMETH', 'hameth.altamar@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Punto Vive Digital'),
(2014, 'MERCADO', 'PACHECO ANA MARIA', 'ana.mercado@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Punto Vive Digital'),
(2015, 'MURILLO', 'CELEDON ANTONIO ENRIQUE', 'antonio.murillo@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Punto Vive Digital'),
(2016, 'PEÑA', 'HOYOS IVANA', 'ivana.pena@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Punto Vive Digital'),
(2017, 'LÓPEZ', 'ARAUJO ITADILDA DEL SOCORRO', 'itadilda.lopez@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Química'),
(2018, 'MARTÍNEZ', 'BARRAZA MARTIN ALONSO', 'martin.martinez@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Química'),
(2019, 'FONTALVO', 'CORONADO MONICA PATRICIA', 'monica.fontalvo@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Física'),
(2020, 'GUTIÉRREZ', 'GARCIA ELIECER JOSE', 'eliecer.gutierrez@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Física'),
(2021, 'HERRERA', 'SARMIENTO MARIA TRINIDAD', 'maria.herrera@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Humanidades'),
(2022, 'ESCORCIA', 'GALINDO LUDIS', 'ludis.escorcia@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Biblioteca'),
(2023, 'OROZCO', 'BERDUGO ROSIBEL', 'rosibel.orozco@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Biblioteca'),
(2024, 'ZAMBRANO', 'REYES GRACIELA ISABEL', 'graciela.zambrano@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Biblioteca'),
(2025, 'FIGUEREDO', 'DOMINGUEZ RAQUEL CRISTINA', 'raquel.figueredo@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Salud'),
(2026, 'MARTÍNEZ', 'PALACIOS DAVINSON', 'davinson.martinez@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Diseño'),
(2027, 'PADILLA', 'CASTRO JESUS ALBERTO', 'jesus.padilla@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Arte'),
(2028, 'CUENTAS', 'PATIÑO MILAGRO DE JESUS', 'milagro.cuentas.biologia@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Biología'),
(2029, 'GARCÍA', 'MERCADO LUIS RICARDO', 'luis.garcia.biologia@institucion.edu', '$2y$10$Yq3BNTxfM5XgEGw3YVNWEOmqrEgzZwTv0MvfEx2DMw6GBqtp7VPP6', 2, 'Activo', 'Docente', 'Biología');

--========================================================
-- 3) ASIGNACIÓN DE DOCENTES A AULAS ACTUALES
--    Se usa horarios_docentes porque es la relación real del proyecto
--========================================================
INSERT INTO horarios_docentes (id_usuario, id_aula, dia_semana, hora_inicio, hora_fin) VALUES
-- Matemáticas -> Aula 1
(2001, 1, 'Lunes', '07:00:00', '09:00:00'),
(2002, 1, 'Martes', '07:00:00', '09:00:00'),
(2003, 1, 'Miércoles', '07:00:00', '09:00:00'),
(2004, 1, 'Jueves', '07:00:00', '09:00:00'),
(2005, 1, 'Viernes', '07:00:00', '09:00:00'),
(2006, 1, 'Sábado', '07:00:00', '09:00:00'),

-- Informática -> Aula 2
(2007, 2, 'Lunes', '08:00:00', '10:00:00'),
(2008, 2, 'Miércoles', '08:00:00', '10:00:00'),

-- Innovación -> Aula 3
(2009, 3, 'Lunes', '09:00:00', '11:00:00'),
(2010, 3, 'Jueves', '09:00:00', '11:00:00'),

-- Punto Vive Digital -> Aula 4
(2011, 4, 'Lunes', '10:00:00', '12:00:00'),
(2012, 4, 'Martes', '10:00:00', '12:00:00'),
(2013, 4, 'Miércoles', '10:00:00', '12:00:00'),
(2014, 4, 'Jueves', '10:00:00', '12:00:00'),
(2015, 4, 'Viernes', '10:00:00', '12:00:00'),
(2016, 4, 'Sábado', '10:00:00', '12:00:00'),

-- Biología -> Aula 5
(2028, 5, 'Lunes', '13:00:00', '15:00:00'),
(2029, 5, 'Miércoles', '13:00:00', '15:00:00'),

-- Química -> Aula 6
(2017, 6, 'Martes', '14:00:00', '16:00:00'),
(2018, 6, 'Jueves', '14:00:00', '16:00:00'),

-- Física -> Aula 7
(2019, 7, 'Lunes', '14:00:00', '16:00:00'),
(2020, 7, 'Martes', '14:00:00', '16:00:00'),
(2017, 7, 'Miércoles', '14:00:00', '16:00:00'),
(2018, 7, 'Jueves', '14:00:00', '16:00:00'),
(2019, 7, 'Viernes', '14:00:00', '16:00:00'),

-- Humanidades -> Aula 8
(2021, 8, 'Martes', '15:00:00', '17:00:00'),

-- Biblioteca -> Aula 9
(2022, 9, 'Lunes', '08:00:00', '10:00:00'),
(2023, 9, 'Martes', '08:00:00', '10:00:00'),
(2024, 9, 'Jueves', '08:00:00', '10:00:00'),

-- Salud -> Aula 10
(2025, 10, 'Miércoles', '09:00:00', '11:00:00'),

-- Diseño -> Aula 11
(2026, 11, 'Jueves', '12:00:00', '14:00:00'),

-- Arte -> Aula 12
(2027, 12, 'Viernes', '15:00:00', '17:00:00');

--========================================================
-- 4) Verificación rápida
--========================================================
SELECT 'AULAS REALES CARGADAS' AS estado, COUNT(*) AS total_aulas FROM aulas;
SELECT 'DOCENTES REALES CARGADOS' AS estado, COUNT(*) AS total_docentes FROM usuarios WHERE id_rol = 2;
SELECT 'ASIGNACIONES CARGADAS' AS estado, COUNT(*) AS total_asignaciones FROM horarios_docentes;
