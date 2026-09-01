# Instalación y despliegue en producción

## Sistema de Gestión Comercial Multiempresa para PYMEs

Este documento describe el procedimiento utilizado para desplegar el sistema en un ambiente de producción, considerando la publicación independiente del frontend, backend y base de datos.

---

## 1. Arquitectura de despliegue

La solución utiliza la siguiente arquitectura:

- **Frontend:** React + Vite desplegado en Vercel.
- **Backend:** Node.js + Express desplegado en Render.
- **Base de datos:** PostgreSQL administrado mediante Neon.
- **ORM:** Prisma.
- **Autenticación:** JWT.
- **Pasarela de pago:** Transbank Webpay Plus en ambiente Sandbox.
- **Control de versiones:** Git y GitHub.

La comunicación general es:

```text
Usuario
   |
   v
Frontend - Vercel
   |
   | HTTPS / API REST
   v
Backend - Render
   |
   | Prisma ORM
   v
PostgreSQL - Neon
   |
   +---- Integración externa con Webpay Plus

   2. Requisitos previos

Para desplegar el sistema se requiere:

Node.js.
npm.
Git.
Cuenta de GitHub.
Cuenta en Neon.
Cuenta en Render.
Cuenta en Vercel.
Proyecto Webpay Plus configurado para ambiente de integración.

El repositorio debe contener las carpetas principales:

sistema-gestion-comercial-multiempresa/
├── backend/
├── frontend/
└── INSTALACION_PRODUCCION.md
3. Base de datos PostgreSQL en Neon
3.1 Crear proyecto

En Neon se debe crear un nuevo proyecto PostgreSQL.

Configuración utilizada durante el despliegue:

Proyecto: sgcm-produccion
Región: AWS South America East 1 - São Paulo
Base de datos: neondb
Branch: production

Neon entrega una cadena de conexión PostgreSQL que debe mantenerse protegida.

Ejemplo de estructura:

postgresql://USUARIO:CONTRASEÑA@HOST/BASE_DE_DATOS?sslmode=require

La cadena real no debe almacenarse directamente en el repositorio.

3.2 Configurar DATABASE_URL

Desde PowerShell, dentro de la carpeta backend, se puede establecer temporalmente la variable:

$env:DATABASE_URL = 'CADENA_DE_CONEXION_NEON'

Se puede comprobar que existe utilizando:

$env:DATABASE_URL -match '^postgresql://'

El resultado esperado es:

True
3.3 Ejecutar migraciones

Con la conexión configurada, ejecutar:

npx prisma migrate deploy

Este comando aplica en PostgreSQL las migraciones existentes del proyecto.

Las migraciones permiten crear las estructuras asociadas a:

Empresas.
Roles.
Usuarios.
Categorías.
Productos.
Clientes.
Movimientos de inventario.
Cotizaciones.
Ventas.
Proveedores.
Órdenes de compra.
IVA en ventas.
Pagos Webpay.
3.4 Ejecutar datos iniciales

Después de las migraciones se debe ejecutar:

npm run seed

El proceso crea los datos básicos necesarios para utilizar el sistema, entre ellos:

Empresa inicial.
Roles.
Administrador.
SuperAdministrador.

Las contraseñas y credenciales utilizadas para el proceso no deben incorporarse al repositorio.

4. Backend en Render
4.1 Crear Web Service

En Render se debe seleccionar:

New
→ Web Service
→ Repositorio de GitHub

Repositorio utilizado:

Iamwaves07/sistema-gestion-comercial-multiempresa
4.2 Configuración del servicio

Configuración utilizada:

Name:
sgcm-backend

Branch:
main

Root Directory:
backend

Runtime:
Node

Build Command:
npm install && npx prisma generate

Start Command:
npm start

El script npm start ejecuta:

node src/server.js

El servidor utiliza:

const PORT = process.env.PORT || 3000;

Esto permite que Render asigne automáticamente el puerto del servicio.

4.3 Variables de entorno del backend

En Render se deben configurar las siguientes variables:

DATABASE_URL
JWT_SECRET
FRONTEND_URL
WEBPAY_RETURN_URL
DATABASE_URL

Contiene la cadena de conexión de PostgreSQL entregada por Neon.

DATABASE_URL=CADENA_DE_CONEXION_NEON
JWT_SECRET

Clave utilizada para firmar y verificar los tokens JWT.

JWT_SECRET=CLAVE_SEGURA

No debe almacenarse en GitHub.

FRONTEND_URL

Corresponde al dominio público autorizado mediante CORS.

En el despliegue realizado:

FRONTEND_URL=https://sistema-gestion-comercial-multiempresa-8532pgith.vercel.app
WEBPAY_RETURN_URL

Dirección utilizada por Webpay para retornar al backend después de procesar una transacción.

WEBPAY_RETURN_URL=https://sgcm-backend-rrq9.onrender.com/pagos/retorno
4.4 URL del backend

El backend publicado está disponible en:

https://sgcm-backend-rrq9.onrender.com
4.5 Verificación del servicio

Para comprobar que la API se encuentra operativa:

https://sgcm-backend-rrq9.onrender.com/health

Respuesta esperada:

{
  "success": true,
  "message": "API funcionando correctamente"
}

Para comprobar la comunicación entre Render y PostgreSQL:

https://sgcm-backend-rrq9.onrender.com/health/database

Respuesta esperada:

{
  "success": true,
  "message": "Conexión con PostgreSQL funcionando correctamente"
}
5. Frontend en Vercel
5.1 Importar proyecto

Desde Vercel:

Add New
→ Project
→ Import Git Repository

Seleccionar:

sistema-gestion-comercial-multiempresa
5.2 Configuración

Debido a que el repositorio contiene frontend y backend, se debe indicar específicamente:

Root Directory:
frontend

Vercel detecta automáticamente:

Framework:
Vite

El comando de construcción corresponde a:

npm run build

El directorio generado por Vite es:

dist
5.3 Variable de entorno

Agregar:

VITE_API_URL

Con el valor:

https://sgcm-backend-rrq9.onrender.com

El frontend utiliza esta variable mediante:

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

De esta forma, el sistema utiliza localhost durante el desarrollo y Render en producción.

5.4 URL pública

El frontend quedó disponible en:

https://sistema-gestion-comercial-multiempresa-8532pgith.vercel.app
6. Configuración de Webpay Plus

El proyecto utiliza Transbank Webpay Plus en ambiente Sandbox.

El flujo utilizado es:

Venta pendiente de pago
        |
        v
Backend crea transacción
        |
        v
Webpay Plus
        |
        v
Cliente realiza pago
        |
        v
Webpay retorna al backend
        |
        v
Backend valida transacción
        |
        +---- APROBADO ----> Venta confirmada
        |                   Stock disminuye
        |                   Movimiento SALIDA
        |
        +---- RECHAZADO ---> Venta continúa pendiente

El sistema no almacena:

Número de tarjeta.
CVV.
Claves bancarias.

Los datos sensibles son gestionados directamente por Transbank.

La URL de retorno utilizada en producción es:

https://sgcm-backend-rrq9.onrender.com/pagos/retorno
7. Validación funcional en producción

Después del despliegue se realizaron pruebas directamente sobre la infraestructura publicada.

7.1 Autenticación

Se verificó:

Inicio de sesión de Administrador.
Inicio de sesión de Vendedor.
Inicio de sesión de SuperAdministrador.
Generación y validación de JWT.
Restricción de módulos según rol.
7.2 Órdenes de compra

Se creó una orden de compra con:

Producto: Mouse inalámbrico
Cantidad: 5
Costo unitario neto: $12.000

Resultado:

Neto:  $60.000
IVA:   $11.400
Total: $71.400

Se comprobó el flujo:

BORRADOR
→ EMITIDA
→ RECEPCIONADA

Al recepcionar la orden:

Stock en Productos:
5 → 10

Además se generó automáticamente un movimiento de tipo:

ENTRADA
7.3 Cotización y venta

Se creó una cotización para:

Cliente:
Distribuidora Los Andes

Producto:
Mouse inalámbrico

Cantidad:
1

El flujo comprobado fue:

BORRADOR
→ ENVIADA
→ ACEPTADA
→ CONVERTIDA

La cotización generó:

VENTA-000001
7.4 Pago Webpay

La venta inicialmente quedó:

PENDIENTE_PAGO

Después de procesar un pago aprobado mediante Webpay Sandbox:

Estado venta:
CONFIRMADA

Estado pago:
APROBADO

El total comprobado fue:

Total: $19.990
Neto:  $16.798
IVA:   $3.192

El stock únicamente se descontó después de confirmar el pago:

Mouse inalámbrico:
10 → 9

También se generó automáticamente un movimiento:

SALIDA

Esto permite mantener trazabilidad entre venta, pago y stock.

8. Validación de permisos

Se verificó el comportamiento de distintos roles.

Administrador

Puede administrar:

Categorías.
Productos.
Clientes.
Proveedores.
Cotizaciones.
Ventas.
Movimientos de inventario.
Órdenes de compra.
Usuarios correspondientes a su ámbito.
Reversas de pagos autorizadas.
Vendedor

Puede operar funciones comerciales, pero presenta restricciones administrativas.

Durante la prueba de producción se verificó que:

Puede consultar ventas.
Puede generar operaciones comerciales autorizadas.
No visualiza Órdenes de Compra.
No visualiza Empresas.
No administra usuarios globales.
No puede anular un pago Webpay aprobado.
SuperAdministrador

Tiene acceso a la gestión global de:

Empresas.
Usuarios asociados a empresas.

Su función corresponde a la administración general de la plataforma.

9. Validación multiempresa

Se utilizaron dos empresas independientes:

Empresa Demo
Comercial Andina Limitada

Se creó un Administrador asociado exclusivamente a Comercial Andina Limitada.

Al iniciar sesión con dicho usuario, el sistema presentó:

Productos: 0
Clientes: 0
Movimientos: 0

Los registros existentes de Empresa Demo no fueron visibles.

Posteriormente se creó en Comercial Andina Limitada la categoría:

Insumos de oficina

Al volver a iniciar sesión como Administrador de Empresa Demo, dicha categoría no apareció.

Esto permitió comprobar la separación de información entre empresas en ambos sentidos.

10. Pruebas automatizadas

Las pruebas del backend se ejecutan mediante:

npm test

Resultado final obtenido:

Test Suites: 5 passed, 5 total
Tests:       9 passed, 9 total
Snapshots:   0 total

Las pruebas consideran:

Generación y validación JWT.
Health check.
Autenticación integrada.
Permisos según rol.
Gestión integrada de ventas.
11. Consideraciones de seguridad

Las siguientes variables nunca deben incluirse directamente en el repositorio:

DATABASE_URL
JWT_SECRET
Contraseñas de usuarios
Credenciales privadas

Los archivos .env deben mantenerse fuera del control de versiones.

La API incorpora además:

JWT.
bcrypt.
Helmet.
CORS.
Rate limiting.
Separación de información por empresa.
Autorización basada en roles.
12. Consideraciones del ambiente gratuito

El backend fue desplegado utilizando un servicio gratuito de Render.

Este tipo de servicio puede entrar en estado de inactividad cuando no recibe solicitudes durante un periodo de tiempo.

Como consecuencia, la primera solicitud después de un periodo de inactividad puede presentar una demora mayor que las solicitudes posteriores.

Para una demostración académica se recomienda acceder previamente a:

https://sgcm-backend-rrq9.onrender.com/health

y posteriormente abrir el frontend unos minutos antes de comenzar la presentación.

En una implementación comercial se recomienda utilizar infraestructura con disponibilidad permanente y ubicar backend y base de datos en regiones geográficas cercanas para reducir latencia.

13. Resultado del despliegue

La arquitectura final desplegada corresponde a:

Frontend
Vercel
https://sistema-gestion-comercial-multiempresa-8532pgith.vercel.app

        |
        | HTTPS
        v

Backend
Render
https://sgcm-backend-rrq9.onrender.com

        |
        | Prisma ORM
        v

Base de datos
PostgreSQL - Neon
Región São Paulo

        |
        +---- Webpay Plus Sandbox

El despliegue permitió comprobar el funcionamiento integrado del sistema fuera del entorno local, incluyendo autenticación, roles, aislamiento multiempresa, operaciones comerciales, actualización de stock, movimientos de inventario y procesamiento de pagos.