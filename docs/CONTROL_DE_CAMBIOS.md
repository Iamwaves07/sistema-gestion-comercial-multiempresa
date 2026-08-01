Control de cambios y alcance del proyecto

Proyecto

Sistema de Gestión Comercial Multiempresa para PYMEs

Última actualización: 31 de julio de 2026.

Este documento registra las funcionalidades, tecnologías, decisiones de arquitectura y pruebas que forman parte de la versión actual del proyecto.

Una funcionalidad solo se considera terminada cuando ha sido desarrollada, probada, registrada mediante un commit y publicada en GitHub.

Funcionalidades desarrolladas y probadas

Arquitectura y base de datos

Backend desarrollado con Node.js y Express.

Base de datos PostgreSQL.

Acceso a datos mediante Prisma ORM.

Migraciones para la creación y evolución de la base de datos.

Arquitectura multiempresa mediante el campo empresaId.

Separación lógica de los datos pertenecientes a distintas empresas.

Conexión entre Express, Prisma y PostgreSQL comprobada.

Uso de variables de entorno para credenciales, configuración del servidor y datos iniciales.

Modelo de datos

El sistema cuenta con las siguientes entidades:

Empresa.

Rol.

Usuario.

Categoría.

Producto.

Cliente.

Movimiento de inventario.

Las principales relaciones desarrolladas son:

Una empresa puede tener múltiples usuarios.

Un rol puede estar asociado a múltiples usuarios.

Una empresa puede tener múltiples categorías, productos, clientes y movimientos de inventario.

Una categoría puede contener múltiples productos.

Un producto puede tener múltiples movimientos de inventario.

Un usuario puede ser responsable de múltiples movimientos de inventario.

Datos iniciales

Creación de datos iniciales mediante un script seed.

Creación o actualización de una empresa de demostración.

Creación de los roles SuperAdministrador, Administrador y Vendedor.

Creación de un usuario Administrador y un usuario SuperAdministrador.

Uso de upsert para evitar la duplicación de los datos iniciales.

Protección de las contraseñas iniciales mediante bcrypt.

Lectura y validación de las variables de entorno requeridas por el seed.

Autenticación y autorización

Contraseñas protegidas mediante bcrypt.

Inicio de sesión mediante correo y contraseña.

Normalización del correo antes de la autenticación.

Generación y validación de tokens JWT.

Configuración de expiración para los tokens.

Middleware para proteger rutas privadas.

Rechazo de solicitudes sin token y de tokens inválidos o expirados.

Consulta del usuario autenticado mediante GET /auth/me.

Validación del estado del usuario, la empresa y el rol.

Control de acceso mediante los roles SuperAdministrador, Administrador y Vendedor.

Middleware de autorización por roles.

Respuesta 401 para solicitudes sin autenticación válida.

Respuesta 403 para usuarios autenticados sin permisos suficientes.

La equivalencia entre los actores descritos en el informe y los roles utilizados en el código es la siguiente:

SuperAdministrador: representa al Administrador del sistema.

Administrador: representa al Administrador de empresa.

Vendedor: representa al Empleado con funciones comerciales e inventario autorizado.

Gestión de empresas

Se desarrolló el módulo de gestión de empresas, disponible exclusivamente para usuarios con rol SuperAdministrador.

Endpoints desarrollados

POST /empresas: crear una empresa.

GET /empresas: listar todas las empresas.

GET /empresas/:id: consultar una empresa por su identificador.

PUT /empresas/:id: actualizar los datos de una empresa.

DELETE /empresas/:id: desactivar lógicamente una empresa.

PATCH /empresas/:id/reactivar: reactivar una empresa desactivada.

Validaciones y seguridad

Todas las rutas requieren un token JWT válido.

El acceso está restringido al rol SuperAdministrador.

Se validan los campos obligatorios, el formato del correo y el formato básico del RUT.

Se normaliza el RUT eliminando puntos y espacios.

Se impide registrar empresas con un RUT duplicado.

La eliminación es lógica mediante el campo estado.

Pruebas realizadas

Se comprobó correctamente:

creación, listado, consulta, actualización, desactivación y reactivación de empresas;

bloqueo de acceso para el rol Administrador mediante respuesta 403;

acceso global permitido para el rol SuperAdministrador.

La empresa de prueba utilizada fue Comercial Andina Limitada, identificada con el ID 5.

Gestión de usuarios

Se desarrolló el módulo de gestión de usuarios con autenticación JWT, separación multiempresa y control de acceso según rol.

Endpoints desarrollados

POST /usuarios: crear un usuario.

GET /usuarios: listar usuarios según el alcance del rol autenticado.

GET /usuarios/:id: consultar un usuario por su identificador.

PUT /usuarios/:id: actualizar los datos, empresa, rol o contraseña de un usuario.

DELETE /usuarios/:id: desactivar lógicamente un usuario.

PATCH /usuarios/:id/reactivar: reactivar un usuario desactivado.

Reglas de acceso

SuperAdministrador puede gestionar usuarios con rol Administrador o Vendedor en cualquier empresa activa.

Administrador puede gestionar solamente usuarios con rol Vendedor dentro de su propia empresa.

Vendedor no tiene acceso al módulo de usuarios.

Las cuentas SuperAdministrador no pueden crearse, editarse, desactivarse ni reactivarse mediante estas rutas.

Un Administrador no puede consultar usuarios de otras empresas ni cuentas SuperAdministrador.

Un Administrador no puede trasladar usuarios a otra empresa.

Validaciones y seguridad

Se valida el formato del correo.

La contraseña debe contener al menos ocho caracteres.

Las contraseñas se almacenan mediante hash con bcrypt.

Se impide registrar correos duplicados.

Solo se pueden asignar empresas y roles activos.

La eliminación es lógica mediante el campo estado.

No se permite reactivar usuarios pertenecientes a una empresa inactiva.

Las contraseñas no se incluyen en las respuestas de la API.

Pruebas realizadas

Se comprobó correctamente:

creación, listado, consulta, actualización, desactivación y reactivación de usuarios;

listado global mediante SuperAdministrador;

listado limitado a la empresa del Administrador;

bloqueo al consultar usuarios de otra empresa;

creación permitida de un Vendedor por el Administrador de su empresa;

bloqueo de acceso para el rol Vendedor.

Los usuarios de prueba utilizados pertenecen a Empresa Demo y Comercial Andina Limitada.

Consulta de roles asignables

Se desarrolló GET /roles, que devuelve los roles activos que el usuario autenticado puede asignar.

Reglas de acceso

SuperAdministrador puede consultar los roles Administrador y Vendedor.

Administrador puede consultar solamente el rol Vendedor.

Vendedor no tiene acceso al endpoint.

El rol SuperAdministrador no se muestra como asignable.

Pruebas realizadas

Se comprobó correctamente la respuesta correspondiente para cada uno de los tres roles.

Categorías

Crear, listar, consultar, actualizar, desactivar y reactivar categorías.

Separar las categorías mediante empresaId.

Prevenir nombres duplicados dentro de una misma empresa.

Asignar automáticamente la empresa desde el JWT validado.

Restringir las operaciones administrativas al rol Administrador.

Pruebas realizadas

Listado de categorías por empresa.

Creación de Insumos de oficina, ID 2, para Comercial Andina Limitada.

Asociación automática con empresaId = 5.

Aislamiento respecto de las categorías de Empresa Demo.

Productos

Crear, listar, consultar, actualizar, desactivar y reactivar productos.

Asociar cada producto con una categoría.

Validar que el producto y su categoría pertenezcan a la misma empresa.

Validar que la categoría se encuentre activa.

Controlar precio, stock y stock mínimo.

Prevenir nombres duplicados dentro de una empresa.

Separar los productos mediante empresaId.

Restringir las operaciones administrativas al rol Administrador.

Pruebas realizadas

Listados independientes para Empresa Demo y Comercial Andina Limitada.

Creación de Resma de papel carta, ID 2, asociada a la categoría Insumos de oficina.

Asociación automática con empresaId = 5.

Bloqueo de consulta directa de productos de otra empresa mediante respuesta 404.

Bloqueo de creación de productos para el rol Vendedor mediante respuesta 403.

Clientes

Crear, listar, consultar, actualizar, desactivar y reactivar clientes.

Validar y normalizar el RUT.

Validar el formato del correo cuando se proporciona.

Prevenir RUT duplicados dentro de una misma empresa.

Separar los clientes mediante empresaId.

Asignar automáticamente la empresa desde el JWT validado.

Restringir las operaciones administrativas al rol Administrador.

Pruebas realizadas

Listado independiente de clientes por empresa.

Creación de Distribuidora Los Andes, ID 2, para Comercial Andina Limitada.

Asociación automática con empresaId = 5.

Bloqueo de consulta directa de clientes de otra empresa mediante respuesta 404.

Inventario y movimientos

Registrar movimientos ENTRADA, SALIDA y AJUSTE.

Actualizar automáticamente el stock del producto.

Prevenir salidas superiores al stock disponible.

Impedir que el stock quede en valores negativos.

Usar transacciones de Prisma para actualizar el stock y registrar el movimiento de forma conjunta.

Revertir la operación completa cuando ocurre un error.

Registrar el usuario y la empresa responsables de cada movimiento.

Validar que el producto pertenezca a la empresa autenticada.

Consultar el historial por empresa y un movimiento por identificador.

Mantener los movimientos como registros históricos sin rutas de edición o eliminación.

Permitir el registro de movimientos a Administrador y Vendedor.

Pruebas realizadas

Historial independiente para cada empresa.

Entrada de cinco unidades: stock de 20 a 25.

Salida válida de tres unidades: stock de 25 a 22.

Rechazo de una salida de 30 unidades cuando el stock era 25, mediante respuesta 409.

Conservación del stock y ausencia de un movimiento falso después de la operación rechazada.

Salida de una unidad registrada por el rol Vendedor: stock de 22 a 21.

Registro de la Vendedora Comercial Andina, ID 8, como responsable.

Bloqueo de consulta de movimientos de otra empresa mediante respuesta 404.

Endpoints técnicos

GET /health para comprobar el funcionamiento de la API.

GET /health/database para comprobar la conexión con PostgreSQL.

GET /auth/admin-check para comprobar la autorización del rol Administrador.

Seguridad complementaria

Helmet para agregar encabezados HTTP de seguridad.

Desactivación explícita de X-Powered-By.

CORS restringido mediante FRONTEND_URL, con respaldo local http://localhost:5173.

Restricción de métodos y encabezados permitidos.

Límite de 100kb para solicitudes JSON.

Rate limiting aplicado a POST /auth/login.

Límite de cinco intentos fallidos dentro de quince minutos.

Exclusión de los inicios de sesión correctos del conteo.

Manejo de rutas inexistentes mediante respuesta 404.

Manejo global de errores mediante respuestas JSON uniformes.

Pruebas realizadas

Presencia de encabezados de Helmet.

Ausencia de X-Powered-By.

Cinco intentos fallidos de login con respuesta 401.

Bloqueo del sexto intento mediante respuesta 429.

Mensaje personalizado para exceso de intentos.

Respuesta 404 en formato JSON para rutas inexistentes.

Continuidad de /health y /health/database después de incorporar los middlewares.

Pruebas integrales de autenticación, roles y aislamiento multiempresa

Se realizaron pruebas manuales mediante PowerShell con usuarios de distintos roles y empresas.

Autenticación

Login correcto del Administrador de Empresa Demo.

Login correcto del SuperAdministrador.

Login correcto de la Administradora de Comercial Andina Limitada.

Login correcto de la Vendedora de Comercial Andina Limitada.

Consulta correcta de GET /auth/me.

Rechazo de GET /auth/me sin token mediante respuesta 401.

Acceso correcto del Administrador a GET /auth/admin-check.

Rechazo de tokens inválidos o expirados.

Autorización por rol

El Administrador no puede acceder a la gestión global de empresas.

El SuperAdministrador puede listar todas las empresas.

El Vendedor puede registrar movimientos de inventario.

El Vendedor no puede crear productos.

Los accesos no autorizados responden con estado 403.

Aislamiento multiempresa

Se comprobó que:

cada Administrador lista únicamente usuarios de su empresa;

el SuperAdministrador puede listar usuarios de todas las empresas;

un Administrador no puede consultar usuarios de otra empresa;

cada empresa lista únicamente sus categorías, productos, clientes y movimientos;

los recursos de otra empresa responden como no encontrados.

El aislamiento se realiza utilizando el empresaId incluido en el JWT validado, evitando depender de un identificador enviado libremente por el cliente.

Herramientas y control de versiones

Pruebas manuales mediante PowerShell.

Revisión de respuestas HTTP exitosas y de error.

Uso de Prisma Studio para visualizar los datos localmente.

Control de versiones mediante Git.

Repositorio público en GitHub.

Commits organizados por funcionalidad.

Publicación periódica en la rama principal.

Revisión de git status en cada bloque.

Sincronización comprobada entre main y origin/main.

Elementos técnicos utilizados para pruebas

GET /auth/admin-check.

GET /health.

GET /health/database.

Empresa Demo.

Comercial Andina Limitada.

Usuarios Administrador, SuperAdministrador y Vendedor.

Categorías, productos, clientes y movimientos ficticios.

Estos elementos deberán revisarse antes de la entrega final para decidir cuáles se mantienen como demostración y cuáles se eliminan.

Funcionalidades todavía no desarrolladas

Los siguientes elementos no deben describirse como terminados en el informe hasta que hayan sido desarrollados, probados, registrados mediante commit y publicados en GitHub.

Validaciones y pruebas automatizadas

Validaciones centralizadas mediante una biblioteca especializada.

Pruebas automatizadas de autenticación y autorización.

Pruebas automatizadas de aislamiento multiempresa.

Pruebas automatizadas de categorías, productos, clientes y movimientos.

Configuración de un entorno de pruebas independiente.

Frontend

Interfaz frontend desarrollada con React y Vite.

Pantalla de inicio de sesión.

Panel principal y menú de navegación.

Gestión visual de categorías, productos y clientes.

Consulta y registro visual de movimientos de inventario.

Formularios, tablas y mensajes de validación.

Integración completa entre frontend y backend.

Entrega y despliegue

Despliegue del backend en un servicio de nube.

Despliegue del frontend.

Base de datos alojada en un entorno remoto.

Variables de entorno para producción.

Documentación técnica final de instalación y ejecución.

Pruebas finales de aceptación.

Revisión de datos y endpoints técnicos utilizados durante el desarrollo.

Frontend incluido en el alcance

El proyecto contempla el desarrollo de una interfaz frontend básica y funcional mediante React y Vite.

La interfaz incluirá, como mínimo:

inicio de sesión;

panel principal;

gestión visual de categorías;

gestión visual de productos;

gestión visual de clientes;

consulta y registro de movimientos de inventario;

comunicación con los endpoints protegidos del backend.

El frontend todavía no se encuentra terminado, pero forma parte del alcance definido para el MVP. Por esta razón, debe mantenerse dentro de la planificación, los objetivos y la descripción de la solución, pero no debe presentarse como una funcionalidad terminada hasta completar su desarrollo y sus pruebas.

Decisiones de arquitectura y seguridad

Separación multiempresa

El empresaId utilizado en las operaciones protegidas se obtiene desde el JWT validado y no desde los datos enviados libremente por el usuario.

En las consultas individuales se exige que coincidan el identificador del recurso y el empresaId de la sesión. Cuando un recurso pertenece a otra empresa, la API responde como no encontrado, evitando revelar su existencia.

Eliminación lógica

Las empresas, los usuarios, las categorías, los productos y los clientes no se eliminan físicamente. La desactivación modifica el campo estado de true a false, permitiendo mantener el historial y reactivar los registros.

Movimientos de inventario

Los movimientos no cuentan con operaciones de actualización o eliminación porque representan el historial del stock. La actualización del producto y la creación del movimiento se realizan dentro de una transacción de Prisma.

Roles y permisos

Los permisos actuales están definidos en los middlewares y rutas del backend. Se utilizan tres roles fijos: SuperAdministrador, Administrador y Vendedor.

No se ha desarrollado una matriz dinámica de permisos. GET /roles permite consultar roles asignables, pero no crearlos ni modificarlos.

SuperAdministrador

El modelo actual exige que todos los usuarios estén asociados a una empresa mediante empresaId. Por esta razón, el SuperAdministrador se encuentra asociado técnicamente a la empresa de demostración, aunque su acceso global se determina por su rol.

Esta decisión deberá revisarse antes de la versión final.

Variables privadas

Las contraseñas, la clave JWT y las credenciales de PostgreSQL se almacenan en .env, archivo que no se publica en GitHub. .env.example contiene únicamente variables de referencia.

Seguridad HTTP

Helmet agrega encabezados de seguridad. CORS restringe orígenes, métodos y encabezados. El limitador del login reduce intentos de fuerza bruta y el límite de JSON reduce solicitudes excesivamente grandes.

Regla de actualización

Cada nueva funcionalidad deberá seguir este orden:

Confirmar que pertenece al alcance final.

Definir los roles autorizados.

Desarrollar la funcionalidad en el código.

Comprobar su sintaxis.

Probar su funcionamiento.

Verificar su aislamiento multiempresa.

Registrar los cambios mediante un commit.

Publicar el commit en GitHub.

Actualizar este documento.

Actualizar las secciones correspondientes del informe.

Una funcionalidad no debe describirse como terminada mientras no haya completado todas las etapas anteriores.