import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  LoaderCircle,
  Mail,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserRoundCog,
  Users,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import UserForm from "../components/UserForm";
import { apiRequest } from "../services/api";

function UsersPage({
  sesion,
  onLogout,
  onNavigate,
}) {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] =
    useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [usuarioEditar, setUsuarioEditar] =
    useState(null);

  const [usuarioEstado, setUsuarioEstado] =
    useState(null);

  const [procesandoEstado, setProcesandoEstado] =
    useState(false);

  const nombreRolSesion =
    sesion.rol?.nombre ||
    sesion.usuario?.rol?.nombre ||
    "";

  const esSuperAdministrador =
    nombreRolSesion === "SuperAdministrador";

  const puedeAdministrarUsuarios =
    nombreRolSesion === "SuperAdministrador" ||
    nombreRolSesion === "Administrador";

  useEffect(() => {
    const cargarUsuarios = async () => {
      setCargando(true);
      setError("");

      try {
        const resultado = await apiRequest(
          "/usuarios",
        );

        setUsuarios(
          resultado?.data?.usuarios || [],
        );
      } catch (errorSolicitud) {
        if (errorSolicitud.status === 401) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cargar los usuarios.",
        );
      } finally {
        setCargando(false);
      }
    };

    cargarUsuarios();
  }, [onLogout]);

  const usuariosFiltrados = useMemo(() => {
    const textoBusqueda = busqueda
      .trim()
      .toLowerCase();

    if (!textoBusqueda) {
      return usuarios;
    }

    return usuarios.filter((usuario) => {
      const camposBusqueda = [
        usuario.nombre,
        usuario.correo,
        usuario.empresa?.nombre,
        usuario.rol?.nombre,
        usuario.estado ? "activo" : "inactivo",
      ];

      return camposBusqueda.some((campo) =>
        String(campo || "")
          .toLowerCase()
          .includes(textoBusqueda),
      );
    });
  }, [busqueda, usuarios]);

  const ordenarUsuarios = (listaUsuarios) => {
    return [...listaUsuarios].sort(
      (usuarioA, usuarioB) => {
        const empresaA =
          usuarioA.empresa?.nombre || "";

        const empresaB =
          usuarioB.empresa?.nombre || "";

        const comparacionEmpresa =
          empresaA.localeCompare(
            empresaB,
            "es",
          );

        if (comparacionEmpresa !== 0) {
          return comparacionEmpresa;
        }

        return usuarioA.nombre.localeCompare(
          usuarioB.nombre,
          "es",
        );
      },
    );
  };

  const puedeModificarUsuario = (usuario) => {
    if (
      usuario.rol?.nombre ===
      "SuperAdministrador"
    ) {
      return false;
    }

    if (esSuperAdministrador) {
      return true;
    }

    return (
      nombreRolSesion === "Administrador" &&
      usuario.rol?.nombre === "Vendedor"
    );
  };

  const abrirFormularioCreacion = () => {
    setError("");
    setMensajeExito("");
    setUsuarioEditar(null);
    setMostrarFormulario(true);
  };

  const abrirFormularioEdicion = (usuario) => {
    setError("");
    setMensajeExito("");
    setUsuarioEditar(usuario);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setUsuarioEditar(null);
  };

  const manejarUsuarioCreado = (
    usuarioCreado,
    mensaje,
  ) => {
    setUsuarios((usuariosActuales) =>
      ordenarUsuarios([
        ...usuariosActuales,
        usuarioCreado,
      ]),
    );

    setMensajeExito(
      mensaje || "Usuario creado correctamente.",
    );

    cerrarFormulario();
  };

  const manejarUsuarioActualizado = (
    usuarioActualizado,
    mensaje,
  ) => {
    setUsuarios((usuariosActuales) =>
      ordenarUsuarios(
        usuariosActuales.map((usuario) =>
          usuario.id === usuarioActualizado.id
            ? usuarioActualizado
            : usuario,
        ),
      ),
    );

    setMensajeExito(
      mensaje ||
        "Usuario actualizado correctamente.",
    );

    cerrarFormulario();
  };

  const abrirConfirmacionEstado = (usuario) => {
    setError("");
    setMensajeExito("");
    setUsuarioEstado(usuario);
  };

  const cerrarConfirmacionEstado = () => {
    setUsuarioEstado(null);
  };

  const confirmarCambioEstado = async () => {
    if (!usuarioEstado) {
      return;
    }

    setProcesandoEstado(true);
    setError("");

    try {
      const estaActivo = usuarioEstado.estado;

      const ruta = estaActivo
        ? `/usuarios/${usuarioEstado.id}`
        : `/usuarios/${usuarioEstado.id}/reactivar`;

      const resultado = await apiRequest(ruta, {
        method: estaActivo ? "DELETE" : "PATCH",
      });

      const usuarioActualizado =
        resultado.data.usuario;

      setUsuarios((usuariosActuales) =>
        usuariosActuales.map((usuario) =>
          usuario.id === usuarioActualizado.id
            ? usuarioActualizado
            : usuario,
        ),
      );

      setMensajeExito(
        resultado.message ||
          (estaActivo
            ? "Usuario desactivado correctamente."
            : "Usuario reactivado correctamente."),
      );

      cerrarConfirmacionEstado();
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible cambiar el estado del usuario.",
      );

      cerrarConfirmacionEstado();
    } finally {
      setProcesandoEstado(false);
    }
  };

  return (
    <AppLayout
      sesion={sesion}
      onLogout={onLogout}
      activeSection="usuarios"
      onNavigate={onNavigate}
    >
      <section className="page-heading products-heading">
        <div>
          <p className="page-eyebrow">
            Administración de accesos
          </p>

          <h1>Usuarios</h1>

          <p>
            Administra las cuentas, empresas y roles
            autorizados para ingresar al sistema.
          </p>
        </div>

        {puedeAdministrarUsuarios && (
          <button
            type="button"
            className="dashboard-primary-button"
            onClick={abrirFormularioCreacion}
          >
            <Plus size={19} />
            Registrar usuario
          </button>
        )}
      </section>

      {mensajeExito && (
        <div
          className="product-success-message"
          role="status"
        >
          {mensajeExito}
        </div>
      )}

      {error && (
        <div
          className="error-message"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="products-card">
        <div className="products-toolbar">
          <div className="products-summary">
            <div className="products-summary-icon">
              <Users size={22} />
            </div>

            <div>
              <span>Usuarios registrados</span>
              <strong>{usuarios.length}</strong>
            </div>
          </div>

          <label className="products-search">
            <Search size={19} />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Buscar por nombre, correo, empresa o rol"
              aria-label="Buscar usuarios"
            />
          </label>
        </div>

        {cargando ? (
          <div className="products-loading">
            <LoaderCircle
              className="spinner"
              size={36}
            />

            <p>Cargando usuarios...</p>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="empty-dashboard-state">
            <TriangleAlert size={34} />

            <strong>
              {usuarios.length === 0
                ? "No hay usuarios registrados"
                : "No se encontraron resultados"}
            </strong>

            <p>
              {usuarios.length === 0
                ? "Los usuarios autorizados aparecerán en esta sección."
                : "Prueba utilizando otro nombre, correo, empresa o rol."}
            </p>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Empresa</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {usuariosFiltrados.map((usuario) => {
                  const puedeModificar =
                    puedeModificarUsuario(usuario);

                  return (
                    <tr key={usuario.id}>
                      <td>
                        <div className="product-name-cell">
                          <div className="product-table-icon">
                            <UserRoundCog size={18} />
                          </div>

                          <div className="user-main-data">
                            <strong>
                              {usuario.nombre}
                            </strong>

                            <small>
                              <Mail size={14} />
                              {usuario.correo}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="user-company-data">
                          <Building2 size={16} />

                          <span>
                            {usuario.empresa?.nombre ||
                              "Sin empresa"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="user-role-badge">
                          <ShieldCheck size={16} />
                          {usuario.rol?.nombre ||
                            "Sin rol"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            usuario.estado
                              ? "product-status product-status-active"
                              : "product-status product-status-inactive"
                          }
                        >
                          {usuario.estado
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </td>

                      <td>
                        {puedeModificar ? (
                          <div className="product-actions">
                            <button
                              type="button"
                              className="product-edit-button"
                              onClick={() =>
                                abrirFormularioEdicion(
                                  usuario,
                                )
                              }
                              aria-label={`Editar ${usuario.nombre}`}
                            >
                              <Pencil size={17} />
                              Editar
                            </button>

                            <button
                              type="button"
                              className={
                                usuario.estado
                                  ? "product-state-button product-state-button-danger"
                                  : "product-state-button product-state-button-success"
                              }
                              onClick={() =>
                                abrirConfirmacionEstado(
                                  usuario,
                                )
                              }
                              aria-label={
                                usuario.estado
                                  ? `Desactivar ${usuario.nombre}`
                                  : `Reactivar ${usuario.nombre}`
                              }
                            >
                              {usuario.estado ? (
                                <>
                                  <PowerOff size={17} />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Power size={17} />
                                  Reactivar
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="user-action-restriction">
                            Sin acciones disponibles
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarFormulario && (
        <UserForm
          sesion={sesion}
          usuarioEditar={usuarioEditar}
          onCancelar={cerrarFormulario}
          onUsuarioCreado={manejarUsuarioCreado}
          onUsuarioActualizado={
            manejarUsuarioActualizado
          }
          onLogout={onLogout}
        />
      )}

      {usuarioEstado && (
        <ConfirmDialog
          elemento={usuarioEstado}
          tipo="usuario"
          procesando={procesandoEstado}
          onCancelar={cerrarConfirmacionEstado}
          onConfirmar={confirmarCambioEstado}
        />
      )}
    </AppLayout>
  );
}

export default UsersPage;