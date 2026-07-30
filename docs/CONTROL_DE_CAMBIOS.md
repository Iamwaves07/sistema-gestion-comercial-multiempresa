# Control de cambios y alcance del proyecto

## Proyecto

Sistema de Gestión Comercial Multiempresa para PYMEs.

Este documento registra las funcionalidades, tecnologías y decisiones que forman parte de la versión final del proyecto. Un elemento solo se considera implementado cuando ha sido desarrollado, probado y guardado en GitHub.

---

## Funcionalidades implementadas y probadas

### Arquitectura y base de datos

- Backend desarrollado con Node.js y Express.
- Base de datos PostgreSQL.
- Acceso a datos mediante Prisma ORM.
- Migraciones para la creación y evolución de la base de datos.
- Arquitectura multiempresa mediante el campo `empresaId`.
- Separación lógica de los datos pertenecientes a distintas empresas.

### Modelo de datos

El sistema cuenta con las siguientes entidades:

- Empresa.
- Rol.
- Usuario.
- Categoría.
- Producto.
- Cliente.
- Movimiento de inventario.

### Autenticación y autorización

- Contraseñas protegidas mediante bcrypt.
- Inicio de sesión mediante correo y contraseña.
- Generación y validación de tokens JWT.
- Middleware para proteger rutas privadas.
- Consulta del usuario autenticado mediante `GET /auth/me`.
- Control de acceso mediante los roles Administrador y Vendedor.

### Categorías

- Crear categorías.
- Listar categorías.
- Consultar una categoría por identificador.
- Actualizar categorías.
- Desactivar categorías mediante eliminación lógica.
- Reactivar categorías.
- Separación de categorías por empresa.
- Prevención de nombres duplicados dentro de una empresa.

### Productos

- Crear productos.
- Listar productos.
- Consultar un producto por identificador.
- Actualizar productos.
- Desactivar productos mediante eliminación lógica.
- Reactivar productos.
- Asociación entre producto y categoría.
- Validación de que el producto y su categoría pertenezcan a la misma empresa.
- Control de precio, stock y stock mínimo.

### Clientes

- Crear clientes.
- Listar clientes.
- Consultar un cliente por identificador.
- Actualizar clientes.
- Desactivar clientes mediante eliminación lógica.
- Reactivar clientes.
- Validación básica del formato del RUT.
- Prevención de RUT duplicado dentro de una empresa.

### Inventario

- Registro de movimientos de tipo ENTRADA.
- Registro de movimientos de tipo SALIDA.
- Registro de movimientos de tipo AJUSTE.
- Actualización automática del stock.
- Prevención de salidas superiores al stock disponible.
- Uso de transacciones de Prisma para actualizar el stock y registrar el movimiento de forma conjunta.
- Registro del usuario responsable del movimiento.
- Consulta del historial de movimientos por empresa.
- Consulta individual de movimientos.

### Herramientas y control de versiones

- Pruebas manuales de endpoints mediante PowerShell.
- Endpoints de salud para verificar la API y PostgreSQL.
- Datos iniciales mediante un script seed.
- Repositorio y control de versiones mediante GitHub.

---

## Elementos técnicos o utilizados para pruebas

- `GET /auth/admin-check`: ruta creada para comprobar la autorización por roles.
- `GET /health`: comprobación técnica del funcionamiento de la API.
- `GET /health/database`: comprobación técnica de la conexión con PostgreSQL.
- Empresa, usuarios, categorías, productos y clientes ficticios utilizados durante las pruebas.

Estos elementos deben revisarse antes de la entrega final para decidir si se mantienen o eliminan.

---

## Funcionalidades todavía no implementadas

Los siguientes elementos no deben describirse como implementados en el informe hasta que hayan sido desarrollados y probados:

- Helmet.
- Configuración formal de CORS.
- Rate limiting.
- Manejo centralizado de errores.
- Manejo de rutas inexistentes.
- Pruebas automatizadas.
- Interfaz frontend.
- Dashboard visual.
- Formularios y tablas para administrar información.
- Despliegue en nube.

---

## Decisión pendiente sobre el frontend

Se debe decidir si la interfaz frontend:

1. Formará parte del alcance final del proyecto; o
2. Se presentará como una recomendación o ampliación futura.

Si se incorpora al proyecto, será necesario actualizar el alcance, los objetivos, la descripción de la solución, la planificación y las limitaciones del informe.

---

## Regla de actualización

Cada nueva funcionalidad debe seguir este orden:

1. Definir si pertenece al alcance final.
2. Desarrollarla en el código.
3. Probar su funcionamiento.
4. Guardarla mediante un commit.
5. Publicarla en GitHub.
6. Actualizar este documento.
7. Actualizar las secciones correspondientes del informe.