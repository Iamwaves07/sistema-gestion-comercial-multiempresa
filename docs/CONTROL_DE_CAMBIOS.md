## Control de cambios y alcance del proyecto

## Proyecto

**Sistema de Gestión Comercial Multiempresa para PYMEs**

Este documento registra las funcionalidades, tecnologías y decisiones que forman parte de la versión final del proyecto.

Un elemento solo se considera implementado cuando ha sido desarrollado, probado, registrado mediante un commit y publicado en GitHub.

---

## Funcionalidades implementadas y probadas

### Arquitectura y base de datos

- Backend desarrollado con Node.js y Express.
- Base de datos PostgreSQL.
- Acceso a datos mediante Prisma ORM.
- Migraciones para la creación y evolución de la base de datos.
- Arquitectura multiempresa mediante el campo `empresaId`.
- Separación lógica de los datos pertenecientes a distintas empresas.
- Conexión entre Express, Prisma y PostgreSQL comprobada.
- Usuario técnico de PostgreSQL utilizado para la conexión de la aplicación.

### Modelo de datos

El sistema cuenta con las siguientes entidades:

- Empresa.
- Rol.
- Usuario.
- Categoría.
- Producto.
- Cliente.
- Movimiento de inventario.

Las principales relaciones implementadas son:

- Una empresa puede tener múltiples usuarios.
- Un rol puede estar asociado a múltiples usuarios.
- Una empresa puede tener múltiples categorías.
- Una empresa puede tener múltiples productos.
- Una categoría puede contener múltiples productos.
- Una empresa puede tener múltiples clientes.
- Una empresa puede registrar múltiples movimientos de inventario.
- Un producto puede tener múltiples movimientos de inventario.
- Un usuario puede ser responsable de múltiples movimientos de inventario.

### Datos iniciales

- Creación de datos iniciales mediante un script `seed`.
- Creación o actualización de una empresa de demostración.
- Creación de los roles SuperAdministrador, Administrador y Vendedor.
- Creación de un usuario Administrador.
- Creación de un usuario SuperAdministrador.
- Uso de `upsert` para evitar la duplicación de los datos iniciales.
- Protección de las contraseñas iniciales mediante bcrypt.

### Autenticación y autorización

- Contraseñas protegidas mediante bcrypt.
- Inicio de sesión mediante correo y contraseña.
- Generación de tokens JWT.
- Validación de tokens JWT.
- Configuración de expiración para los tokens.
- Middleware para proteger rutas privadas.
- Rechazo de solicitudes sin token.
- Rechazo de tokens inválidos o expirados.
- Consulta del usuario autenticado mediante `GET /auth/me`.
- Validación del estado del usuario, la empresa y el rol.
- Control de acceso mediante los roles SuperAdministrador, Administrador y Vendedor.
- Middleware de autorización por roles.
- Respuesta `403` para usuarios sin permisos suficientes.

La equivalencia entre los actores descritos en el informe y los roles utilizados en el código es la siguiente:

- **SuperAdministrador:** representa al Administrador del sistema.
- **Administrador:** representa al Administrador de empresa.
- **Vendedor:** representa al Empleado con funciones comerciales e inventario autorizado.

### Categorías

- Crear categorías.
- Listar categorías.
- Consultar una categoría por identificador.
- Actualizar categorías.
- Desactivar categorías mediante eliminación lógica.
- Reactivar categorías.
- Separar las categorías mediante `empresaId`.
- Prevenir nombres duplicados dentro de una misma empresa.
- Validar que el usuario solo consulte o modifique categorías de su empresa.
- Proteger las operaciones administrativas mediante JWT y autorización por rol.

### Productos

- Crear productos.
- Listar productos.
- Consultar un producto por identificador.
- Actualizar productos.
- Desactivar productos mediante eliminación lógica.
- Reactivar productos.
- Asociar cada producto con una categoría.
- Validar que el producto y su categoría pertenezcan a la misma empresa.
- Validar que la categoría se encuentre activa.
- Controlar precio, stock y stock mínimo.
- Prevenir nombres de productos duplicados dentro de una empresa.
- Separar los productos mediante `empresaId`.
- Proteger las operaciones administrativas mediante JWT y autorización por rol.

### Clientes

- Crear clientes.
- Listar clientes.
- Consultar un cliente por identificador.
- Actualizar clientes.
- Desactivar clientes mediante eliminación lógica.
- Reactivar clientes.
- Validar de forma básica el formato del RUT.
- Normalizar el RUT eliminando puntos y espacios.
- Validar el formato del correo electrónico cuando se proporciona.
- Prevenir RUT duplicados dentro de una misma empresa.
- Separar los clientes mediante `empresaId`.
- Proteger las operaciones administrativas mediante JWT y autorización por rol.

### Inventario

- Registrar movimientos de tipo `ENTRADA`.
- Registrar movimientos de tipo `SALIDA`.
- Registrar movimientos de tipo `AJUSTE`.
- Actualizar automáticamente el stock del producto.
- Sumar unidades al registrar una entrada.
- Restar unidades al registrar una salida.
- Establecer el stock final mediante un ajuste.
- Prevenir salidas superiores al stock disponible.
- Impedir que el stock quede en valores negativos.
- Usar transacciones de Prisma para actualizar el stock y registrar el movimiento de forma conjunta.
- Revertir la operación completa cuando ocurre un error durante la transacción.
- Registrar el usuario responsable de cada movimiento.
- Registrar la empresa asociada al movimiento.
- Validar que el producto pertenezca a la empresa autenticada.
- Validar que el producto y su categoría se encuentren activos.
- Consultar el historial de movimientos por empresa.
- Ordenar los movimientos desde el más reciente al más antiguo.
- Consultar un movimiento individual por identificador.
- Mantener los movimientos como registros históricos sin rutas de edición o eliminación.

### Endpoints técnicos

- `GET /health` para comprobar el funcionamiento de la API.
- `GET /health/database` para comprobar la conexión con PostgreSQL.
- Consulta técnica mediante Prisma para verificar la disponibilidad de la base de datos.

### Herramientas y control de versiones

- Pruebas manuales de endpoints mediante PowerShell.
- Revisión de respuestas HTTP exitosas y de error.
- Comprobación de rutas protegidas con tokens válidos, ausentes e inválidos.
- Uso de Prisma Studio para visualizar los datos de manera local.
- Control de versiones mediante Git.
- Repositorio público en GitHub.
- Commits organizados por funcionalidad.
- Publicación periódica de los avances en la rama principal.

---

## Elementos técnicos o utilizados para pruebas

Los siguientes elementos fueron creados para apoyar el desarrollo o comprobar el funcionamiento del sistema:

- `GET /auth/admin-check`, utilizado para probar la autorización por roles.
- `GET /health`, utilizado para comprobar que la API se encuentra activa.
- `GET /health/database`, utilizado para comprobar la conexión con PostgreSQL.
- Empresa de demostración utilizada durante el desarrollo.
- Usuarios Administrador y SuperAdministrador creados mediante el script `seed`.
- Categorías, productos y clientes ficticios utilizados durante las pruebas.
- Movimientos de inventario ficticios utilizados para probar entradas, salidas y ajustes.

Estos elementos deberán revisarse antes de la entrega final para decidir cuáles se mantienen como datos o rutas de demostración y cuáles se eliminan.

---

## Funcionalidades todavía no implementadas

Los siguientes elementos no deben describirse como implementados en el informe hasta que hayan sido desarrollados, probados y publicados en GitHub:

### Administración del sistema

- CRUD de empresas.
- CRUD de usuarios.
- Endpoints para consultar y administrar roles.
- Administración completa de permisos por rol.
- Restricción global de las operaciones exclusivas del SuperAdministrador.

### Seguridad complementaria

- Helmet.
- Configuración formal de CORS.
- Rate limiting.
- Manejo centralizado de errores.
- Manejo de rutas inexistentes.
- Validaciones centralizadas mediante una biblioteca especializada.
- Pruebas automatizadas de autenticación, autorización y aislamiento multiempresa.

### Frontend

- Interfaz frontend desarrollada con React y Vite.
- Pantalla de inicio de sesión.
- Panel principal.
- Menú de navegación.
- Gestión visual de categorías.
- Gestión visual de productos.
- Gestión visual de clientes.
- Consulta y registro visual de movimientos de inventario.
- Formularios, tablas y mensajes de validación.
- Integración completa entre frontend y backend.

### Entrega y despliegue

- Despliegue del backend en un servicio de nube.
- Despliegue del frontend.
- Base de datos alojada en un entorno remoto.
- Configuración de variables de entorno para producción.
- Documentación técnica final de instalación y ejecución.
- Pruebas finales de aceptación.

---

## Frontend incluido en el alcance

El proyecto contempla el desarrollo de una interfaz frontend básica y funcional mediante React y Vite.

La interfaz incluirá, como mínimo:

- Inicio de sesión.
- Panel principal.
- Gestión visual de categorías.
- Gestión visual de productos.
- Gestión visual de clientes.
- Consulta y registro de movimientos de inventario.
- Comunicación con los endpoints protegidos del backend.

El frontend todavía no se encuentra implementado, pero forma parte del alcance definido para el MPV.

Por esta razón, debe mantenerse dentro de la planificación, los objetivos y la descripción de la solución, pero no debe presentarse como una funcionalidad terminada hasta completar su desarrollo y sus pruebas.

---

## Decisiones de arquitectura y seguridad

### Separación multiempresa

El `empresaId` utilizado en las operaciones protegidas se obtiene desde el JWT validado y no desde los datos enviados libremente por el usuario.

Esto reduce el riesgo de que una persona intente consultar o modificar información perteneciente a otra empresa.

### Eliminación lógica

Las categorías, productos y clientes no se eliminan físicamente de la base de datos.

La desactivación modifica el campo `estado` de `true` a `false`, permitiendo mantener el historial y reactivar posteriormente los registros.

### Movimientos de inventario

Los movimientos de inventario no cuentan con operaciones de actualización o eliminación, debido a que representan el historial de cambios realizados sobre el stock.

### SuperAdministrador

El modelo actual exige que todos los usuarios estén asociados a una empresa mediante `empresaId`.

Por esta razón, el usuario SuperAdministrador se encuentra asociado técnicamente a la empresa de demostración. Su acceso global será determinado por su rol y por las reglas de autorización que se implementen en los endpoints de administración del sistema.

Esta decisión deberá revisarse antes de la versión final para confirmar si se mantiene o si se modifica el modelo de datos.

### Variables privadas

Las contraseñas, la clave utilizada para firmar JWT y las credenciales de PostgreSQL se almacenan en el archivo privado `.env`.

El archivo `.env` no se publica en GitHub.

El archivo `.env.example` contiene únicamente nombres de variables y valores de referencia que permiten conocer la configuración necesaria sin revelar credenciales reales.

---

## Regla de actualización

Cada nueva funcionalidad deberá seguir este orden:

1. Confirmar que pertenece al alcance final.
2. Definir los roles autorizados.
3. Desarrollar la funcionalidad en el código.
4. Comprobar su sintaxis.
5. Probar su funcionamiento.
6. Verificar su aislamiento multiempresa.
7. Registrar los cambios mediante un commit.
8. Publicar el commit en GitHub.
9. Actualizar este documento.
10. Actualizar las secciones correspondientes del informe.

Una funcionalidad no debe describirse como implementada mientras no haya completado todas las etapas anteriores.

## Gestión de empresas

Se desarrolló el módulo de gestión de empresas, disponible exclusivamente para usuarios con rol `SuperAdministrador`.

### Endpoints desarrollados

- `POST /empresas`: crear una empresa.
- `GET /empresas`: listar todas las empresas.
- `GET /empresas/:id`: consultar una empresa por su identificador.
- `PUT /empresas/:id`: actualizar los datos de una empresa.
- `DELETE /empresas/:id`: desactivar lógicamente una empresa.
- `PATCH /empresas/:id/reactivar`: reactivar una empresa desactivada.

### Validaciones y seguridad

- Todas las rutas requieren un token JWT válido.
- El acceso está restringido al rol `SuperAdministrador`.
- Se validan los campos obligatorios, el formato del correo y el formato básico del RUT.
- Se impide registrar empresas con un RUT duplicado.
- La eliminación es lógica mediante el campo `estado`, evitando borrar físicamente los registros.

### Pruebas realizadas

Se comprobó correctamente:

- creación de una empresa;
- listado general;
- consulta por ID;
- actualización de datos;
- desactivación lógica;
- reactivación.

La empresa de prueba utilizada fue `Comercial Andina Limitada`, identificada con el ID `5`.