# Sistema de reservas de aulas

> Proyecto académico orientado a la gestión institucional de reservas, horarios, usuarios y control operativo de aulas.

<div align="center">
  <img src="img/Laboratorio%20escolar%20de%20programaci%C3%B3n.png" alt="Laboratorio escolar de programación" width="430" />
  <img src="img/Docente%20observa%20laboratorio%20de%20computaci%C3%B3n.png" alt="Docente observando laboratorio de computación" width="430" />
</div>

<p align="center">
  <img src="https://img.shields.io/badge/Proyecto%20de%20grado-Sistema%20institucional-0EA5E9?style=for-the-badge" alt="Proyecto de grado" />
  <img src="https://img.shields.io/badge/Stack-Next.js%20%2B%20Supabase-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js + Supabase" />
  <img src="https://img.shields.io/badge/Frontend-React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Backend-PHP%20%2B%20MySQL-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP + MySQL" />
</p>

## 🌐 Demo

La versión funcional del sistema está disponible en:

**[https://sistema-reservas-aulas-fkhm.vercel.app/login](https://sistema-reservas-aulas-fkhm.vercel.app/)**

> Este prototipo permite visualizar la lógica de negocio, el flujo de autenticación, la gestión de reservas y los paneles por rol en un entorno web moderno.

## 📌 Descripción del proyecto

Este repositorio presenta una solución para la gestión de reservas de aulas en una institución educativa. El objetivo es facilitar la administración del uso de los espacios académicos, reducir conflictos de horario y mejorar la organización del personal docente y administrativo.

El sistema está pensado para ofrecer una experiencia clara y ordenada, con validaciones de disponibilidad, roles definidos por usuario y una estructura que permite escalar hacia un entorno institucional real.

## 🎯 Problema que resuelve

En muchos contextos académicos, la gestión de aulas se realiza de forma manual o poco estructurada, lo que puede generar:

- conflictos de horario,
- doble asignación de un mismo espacio,
- dificultad para consultar disponibilidad,
- demora en la coordinación entre docentes y administración,
- poca trazabilidad en el seguimiento de solicitudes.

La solución centraliza la información y organiza la gestión desde una plataforma única.

## ✨ Funcionalidades principales

- autenticación por roles, 
- gestión de usuarios y permisos,
- control de aulas y disponibilidad,
- creación y validación de reservas,
- seguimiento del estado de solicitudes,
- panel general para administración,
- dashboard para docentes,
- flujo preparado para despliegue web con Vercel + Supabase.

## 👥 Roles del sistema

### Superadministrador
Puede gestionar usuarios, reservas, aulas, horarios y reportes del sistema.

### Profesor
Puede consultar disponibilidad, registrar solicitudes y revisar el estado de sus reservas.

## 🛠️ Stack tecnológico

- PHP
- MySQL
- JavaScript
- Bootstrap
- React
- Next.js
- Supabase

## 🧭 Flujo principal del sistema

1. El usuario ingresa al sistema con sus credenciales.
2. El sistema identifica su rol.
3. Se muestra el panel correspondiente según el perfil.
4. El docente registra una reserva con aula, fecha y horario.
5. El sistema valida disponibilidad y el administrador revisa la solicitud.
6. La solicitud cambia de estado y queda registrada en la plataforma.

## 📸 Capturas del sistema

### Login institucional

<p align="center">
  <img src="docs/imagenes/login.jpeg" alt="Pantalla de login" width="900" />
</p>

### Landing / presentación inicial

<p align="center">
  <img src="docs/imagenes/landing%20pace.jpeg" alt="Landing page del sistema" width="900" />
</p>

### Panel administrador

<p align="center">
  <img src="docs/imagenes/administrador.jpeg" alt="Panel administrativo" width="900" />
</p>

### Dashboard del profesor

<p align="center">
  <img src="docs/imagenes/profesor.jpeg" alt="Dashboard de profesor" width="900" />
</p>

### Gestión de reservas

<p align="center">
  <img src="docs/imagenes/reservas.jpeg" alt="Gestión de reservas" width="900" />
</p>

## 📁 Estructura del repositorio

```text
.
├── DOC/
│   └── fotos de como se ve/
├── docs/
│   └── imagenes/
├── admin/
├── aulas/
├── config/
├── css/
├── database/
├── docs/
├── horarios/
├── img/
├── js/
├── login/
├── migracion-vercel/
├── reportes/
├── reservas/
├── supabase/
├── usuarios/
├── README.md
├── package.json
├── dashboard.php
├── index.php
├── run.bat
├── run.ps1
├── .env.local
└── .gitignore
```

## ⚙️ Instalación y ejecución

### Requisitos

- Node.js
- npm
- PHP
- MySQL o MariaDB
- navegador moderno

### Ejecutar localmente

```bash
npm install
npm run dev
```

### Configuración de entorno

En la versión web migrada se usan variables de entorno para Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

> Las credenciales reales deben mantenerse en el entorno de despliegue y no deben compartirse en el repositorio.

## 🚀 Estado del proyecto

El proyecto se encuentra en una etapa de prototipo funcional con lógica institucional aplicada y enfocada en la gestión real de reservas académicas. La solución evidencia el trabajo desarrollado y la propuesta aplicada a un caso concreto dentro del entorno educativo.

## ✅ Conclusión

Este repositorio representa una propuesta funcional, ordenada y aplicada a la realidad institucional. Su valor principal radica en resolver un problema recurrente del entorno académico: la organización del uso de aulas y la coordinación de horarios de manera digital, segura y clara.

La intención del proyecto no es solo mostrar código, sino dejar evidencia de un desarrollo pensado para la institución, con una lógica sólida, una estructura útil y una experiencia de uso clara para usuarios administrativos y docentes.

---

<p align="center">
  <img src="https://img.shields.io/badge/Proyecto%20acad%C3%A9mico-Desarrollo%20institucional-10B981?style=for-the-badge" alt="Proyecto académico" />
</p>
