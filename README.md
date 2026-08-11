# Sistema de Gestión Comercial Multiempresa

Sistema desarrollado como Proyecto de Título de Ingeniería en Computación e Informática.

La solución está orientada a PYMEs del rubro comercial y permite centralizar la gestión de información de distintas empresas dentro de una misma plataforma, manteniendo separación lógica de los datos según la empresa asociada a cada usuario.

## Funcionalidades principales

El sistema contempla funcionalidades para:

- Autenticación mediante JWT.
- Gestión de empresas.
- Gestión de usuarios y roles.
- Gestión de categorías.
- Gestión de productos.
- Gestión de clientes.
- Consulta y control de inventario.
- Registro de movimientos de stock.
- Control de acceso según rol.
- Separación lógica de información por empresa.

## Arquitectura general

La solución está compuesta por:

- **Frontend:** React + Vite.
- **Backend:** Node.js + Express.
- **Base de datos:** PostgreSQL.
- **ORM:** Prisma.
- **Autenticación:** JWT.
- **Control de versiones:** Git y GitHub.
- **Pruebas automatizadas:** Jest + Supertest.

## Estructura del proyecto

```text
sistema-gestion-comercial-multiempresa/
├── backend/        # API REST, lógica de negocio y acceso a datos
├── frontend/       # Interfaz de usuario desarrollada con React
├── docs/           # Documentación y diagramas del proyecto
├── README.md
└── .gitignore
```

## Entorno utilizado y validado

El proyecto ha sido desarrollado y probado utilizando:

- Node.js 24.12.0
- npm 11.6.2
- PostgreSQL 17.10
- Git 2.54.0

Estas versiones corresponden al entorno utilizado durante el desarrollo y validación del proyecto.

## Requisitos previos

Antes de ejecutar el sistema se debe contar con:

- Git.
- Node.js y npm.
- PostgreSQL.
- Un usuario de PostgreSQL con permisos para utilizar la base de datos.
- Dos terminales disponibles para ejecutar backend y frontend durante el desarrollo local.

---

# Instalación

## 1. Clonar el repositorio

```bash
git clone https://github.com/Iamwaves07/sistema-gestion-comercial-multiempresa.git
cd sistema-gestion-comercial-multiempresa
```

También es posible descargar el proyecto como archivo ZIP desde GitHub y descomprimirlo localmente.

---

# Configuración del Backend

## 2. Instalar dependencias

Ingresar a la carpeta del backend:

```bash
cd backend
```

Instalar las dependencias:

```bash
npm install
```

## 3. Configurar PostgreSQL

Se debe disponer de una base de datos PostgreSQL para el sistema.

La configuración utilizada por defecto considera:

```text
Base de datos principal:
sistema_gestion_comercial_multiempresa

Base de datos shadow para desarrollo con Prisma:
sistema_gestion_comercial_multiempresa_shadow
```

Las bases pueden ser creadas utilizando PostgreSQL, pgAdmin u otra herramienta compatible.

## 4. Configurar variables de entorno

El backend incluye el archivo:

```text
backend/.env.example
```

Se debe crear una copia llamada:

```text
backend/.env
```

y reemplazar los valores de ejemplo por los correspondientes al entorno.

Variables principales:

```env
DATABASE_URL="postgresql://USUARIO:CONTRASENA@localhost:5432/sistema_gestion_comercial_multiempresa?schema=public"

SHADOW_DATABASE_URL="postgresql://USUARIO:CONTRASENA@localhost:5432/sistema_gestion_comercial_multiempresa_shadow?schema=public"

SEED_EMPRESA_NOMBRE="Empresa Demo"
SEED_EMPRESA_RUT="RUT_EMPRESA_AQUI"
SEED_EMPRESA_CORREO="correo@empresa.cl"

SEED_ADMIN_NOMBRE="Administrador General"
SEED_ADMIN_CORREO="admin@empresa.cl"
SEED_ADMIN_PASSWORD="CAMBIAR_ESTA_CONTRASENA"

SEED_SUPERADMIN_NOMBRE="Administrador del Sistema"
SEED_SUPERADMIN_CORREO="superadmin@sgcm.cl"
SEED_SUPERADMIN_PASSWORD="CAMBIAR_ESTA_CONTRASENA"

JWT_SECRET="GENERAR_UNA_CLAVE_SECRETA_SEGURA"
JWT_EXPIRES_IN="1h"

PORT=3000
FRONTEND_URL=http://localhost:5173
```

> El archivo `.env` contiene información privada y no debe almacenarse en el repositorio. El proyecto mantiene únicamente `.env.example` como plantilla de configuración.

## 5. Aplicar las migraciones de Prisma

El repositorio contiene las migraciones necesarias para construir la estructura de la base de datos.

Para un entorno de despliegue se pueden aplicar mediante:

```bash
npx prisma migrate deploy
```

Para comprobar el estado de las migraciones:

```bash
npx prisma migrate status
```

El proyecto actualmente contiene seis migraciones correspondientes a:

- Empresas.
- Roles y usuarios.
- Categorías.
- Productos.
- Clientes.
- Movimientos de inventario.

## 6. Cargar los datos iniciales

Ejecutar:

```bash
npm run seed
```

El proceso genera o actualiza los datos iniciales definidos mediante las variables de entorno, incluyendo:

- Empresa inicial.
- Rol SuperAdministrador.
- Rol Administrador.
- Rol Vendedor.
- Usuario Administrador.
- Usuario SuperAdministrador.

## 7. Iniciar el backend

Para ejecución normal:

```bash
npm start
```

El backend utilizará por defecto:

```text
http://localhost:3000
```

Para desarrollo con recarga automática:

```bash
npm run dev
```

---

# Configuración del Frontend

## 8. Instalar dependencias

Desde la raíz del proyecto:

```bash
cd frontend
npm install
```

## 9. Configurar la URL de la API

El frontend incluye:

```text
frontend/.env.example
```

Crear una copia denominada:

```text
frontend/.env
```

La configuración local por defecto es:

```env
VITE_API_URL=http://localhost:3000
```

En un ambiente desplegado, este valor debe reemplazarse por la URL real donde se encuentre disponible la API.

> Las variables con información sensible, como contraseñas o secretos JWT, nunca deben almacenarse en el frontend.

## 10. Ejecutar el frontend en desarrollo

```bash
npm run dev
```

Vite utilizará normalmente:

```text
http://localhost:5173
```

## 11. Generar el frontend para producción

Ejecutar:

```bash
npm run build
```

Vite generará los archivos compilados dentro de:

```text
frontend/dist/
```

El build puede ser comprobado localmente mediante:

```bash
npm run preview
```

---

# Verificación de la instalación

## API

Con el backend ejecutándose, comprobar:

```text
http://localhost:3000/health
```

La respuesta esperada es:

```json
{
  "success": true,
  "message": "API funcionando correctamente"
}
```

También se puede comprobar la conexión con PostgreSQL mediante:

```text
http://localhost:3000/health/database
```

La respuesta esperada es:

```json
{
  "success": true,
  "message": "Conexión con PostgreSQL funcionando correctamente"
}
```

---

# Pruebas automatizadas

El backend incorpora pruebas automatizadas utilizando Jest y Supertest.

Desde la carpeta `backend` ejecutar:

```bash
npm test
```

Actualmente se incluyen pruebas para:

- Generación y verificación de JWT.
- Disponibilidad de la API.
- Flujo de integración de autenticación mediante login y acceso a ruta protegida.

Durante la validación del proyecto se obtuvo:

```text
Test Suites: 3 passed, 3 total
Tests:       3 passed, 3 total
```

---

# Flujo resumido de instalación

```text
Clonar repositorio
        ↓
Instalar PostgreSQL
        ↓
Configurar bases de datos
        ↓
Configurar backend/.env
        ↓
Instalar dependencias del backend
        ↓
Aplicar migraciones de Prisma
        ↓
Ejecutar seed
        ↓
Iniciar backend
        ↓
Configurar frontend/.env
        ↓
Instalar dependencias del frontend
        ↓
Generar o ejecutar frontend
        ↓
Verificar API y aplicación
```

---

# Consideraciones para un ambiente productivo

Para un despliegue productivo se recomienda:

- Utilizar contraseñas seguras y diferentes a las utilizadas durante desarrollo.
- Generar un `JWT_SECRET` robusto.
- Configurar `FRONTEND_URL` con el dominio real autorizado.
- Configurar `VITE_API_URL` con la URL pública del backend.
- Utilizar HTTPS.
- Mantener las credenciales fuera del repositorio.
- Ejecutar las migraciones versionadas antes de iniciar una nueva versión.
- Generar el frontend mediante `npm run build`.
- Mantener respaldos periódicos de PostgreSQL.
- Utilizar variables de entorno administradas por la plataforma de despliegue.

Como mejora futura puede incorporarse contenerización mediante Docker para facilitar la reproducción y despliegue uniforme del entorno.

---

# Control de versiones

El proyecto utiliza Git y GitHub para mantener trazabilidad sobre los cambios realizados.

Las versiones estables se identifican mediante:

- Commits descriptivos.
- Tags de versión.
- Releases.
- Release Notes con las funcionalidades incorporadas.

Repositorio:

```text
https://github.com/Iamwaves07/sistema-gestion-comercial-multiempresa
```

---

# Autora

**Yesenia Nicole Fernandois Badilla**

Proyecto de Título
Ingeniería en Computación e Informática