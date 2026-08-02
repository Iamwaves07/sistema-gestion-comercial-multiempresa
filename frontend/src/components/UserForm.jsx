import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  Pencil,
  Save,
  UserPlus,
  X,
} from "lucide-react";
import { apiRequest } from "../services/api";

const datosIniciales = {
  nombre: "",
  correo: "",
  password: "",
  empresaId: "",
  rolId: "",
};

function UserForm({
  sesion,
  usuarioEditar = null,
  onCancelar,
  onUsuarioCreado,
  onUsuarioActualizado,
  onLogout,
}) {
  const esEdicion = Boolean(usuarioEditar);

  const nombreRolSesion =
    sesion.rol?.nombre ||
    sesion.usuario?.rol?.nombre ||
    "";

  const esSuperAdministrador =
    nombreRolSesion === "SuperAdministrador";

  const [formulario, setFormulario] =
    useState(datosIniciales);

  const [roles, setRoles] = useState([]);
  const [empresas, setEmpresas] = useState([]);

  const [cargandoOpciones, setCargandoOpciones] =
    useState(true);

  const [guardando, setGuardando] = useState(false);
  const [mostrarPassword, setMostrarPassword] =
    useState(false);

  const [error, setError] = useState("");

  const empresasActivas = useMemo(() => {
    return empresas.filter((empresa) => empresa.estado);
  }, [empresas]);

  useEffect(() => {
    const cargarOpciones = async () => {
      setCargandoOpciones(true);
      setError("");

      try {
        const solicitudRoles = apiRequest("/roles");

        const solicitudEmpresas =
          esSuperAdministrador
            ? apiRequest("/empresas")
            : Promise.resolve({
                data: {
                  empresas: [],
                },
              });

        const [
          resultadoRoles,
          resultadoEmpresas,
        ] = await Promise.all([
          solicitudRoles,
          solicitudEmpresas,
        ]);

        const rolesDisponibles =
          resultadoRoles?.data?.roles || [];

        const empresasDisponibles =
          resultadoEmpresas?.data?.empresas || [];

        setRoles(rolesDisponibles);
        setEmpresas(empresasDisponibles);

        if (usuarioEditar) {
          setFormulario({
            nombre: usuarioEditar.nombre || "",
            correo: usuarioEditar.correo || "",
            password: "",
            empresaId: usuarioEditar.empresa?.id
              ? String(usuarioEditar.empresa.id)
              : "",
            rolId: usuarioEditar.rol?.id
              ? String(usuarioEditar.rol.id)
              : "",
          });

          return;
        }

        setFormulario({
          ...datosIniciales,
          rolId: rolesDisponibles[0]?.id
            ? String(rolesDisponibles[0].id)
            : "",
          empresaId:
            esSuperAdministrador &&
            empresasDisponibles.find(
              (empresa) => empresa.estado,
            )?.id
              ? String(
                  empresasDisponibles.find(
                    (empresa) => empresa.estado,
                  ).id,
                )
              : "",
        });
      } catch (errorSolicitud) {
        if (errorSolicitud.status === 401) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cargar los roles y empresas disponibles.",
        );
      } finally {
        setCargandoOpciones(false);
      }
    };

    cargarOpciones();
  }, [
    esSuperAdministrador,
    onLogout,
    usuarioEditar,
  ]);

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target;

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }));

    setError("");
  };

  const guardarUsuario = async (evento) => {
    evento.preventDefault();

    setGuardando(true);
    setError("");

    try {
      const datosUsuario = {
        nombre: formulario.nombre.trim(),
        correo: formulario.correo
          .trim()
          .toLowerCase(),
        rolId: Number(formulario.rolId),
      };

      if (esSuperAdministrador) {
        datosUsuario.empresaId = Number(
          formulario.empresaId,
        );
      }

      if (!esEdicion) {
        datosUsuario.password = formulario.password;
      }

      if (
        esEdicion &&
        formulario.password.length > 0
      ) {
        datosUsuario.password = formulario.password;
      }

      if (esEdicion) {
        const resultado = await apiRequest(
          `/usuarios/${usuarioEditar.id}`,
          {
            method: "PUT",
            body: JSON.stringify(datosUsuario),
          },
        );

        onUsuarioActualizado(
          resultado.data.usuario,
          resultado.message,
        );

        return;
      }

      const resultado = await apiRequest("/usuarios", {
        method: "POST",
        body: JSON.stringify(datosUsuario),
      });

      onUsuarioCreado(
        resultado.data.usuario,
        resultado.message,
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          (esEdicion
            ? "No fue posible actualizar el usuario."
            : "No fue posible crear el usuario."),
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section
        className="product-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
      >
        <header className="product-form-header">
          <div className="product-form-title">
            <div className="product-form-title-icon">
              {esEdicion ? (
                <Pencil size={24} />
              ) : (
                <UserPlus size={24} />
              )}
            </div>

            <div>
              <p className="page-eyebrow">
                Administración de accesos
              </p>

              <h2 id="user-form-title">
                {esEdicion
                  ? "Editar usuario"
                  : "Registrar usuario"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            className="product-form-close"
            onClick={onCancelar}
            aria-label="Cerrar formulario"
            disabled={guardando}
          >
            <X size={21} />
          </button>
        </header>

        <form
          className="product-form"
          onSubmit={guardarUsuario}
        >
          {error && (
            <div
              className="error-message"
              role="alert"
            >
              {error}
            </div>
          )}

          {cargandoOpciones ? (
            <div className="products-loading">
              <LoaderCircle
                className="spinner"
                size={34}
              />

              <p>Cargando opciones...</p>
            </div>
          ) : (
            <>
              <div className="product-form-grid">
                <label className="product-form-field">
                  <span>Nombre del usuario</span>

                  <input
                    type="text"
                    name="nombre"
                    value={formulario.nombre}
                    onChange={actualizarCampo}
                    placeholder="Ejemplo: Camila González"
                    autoComplete="name"
                    required
                    disabled={guardando}
                  />
                </label>

                <label className="product-form-field">
                  <span>Correo electrónico</span>

                  <input
                    type="email"
                    name="correo"
                    value={formulario.correo}
                    onChange={actualizarCampo}
                    placeholder="usuario@empresa.cl"
                    autoComplete="email"
                    required
                    disabled={guardando}
                  />
                </label>

                <label className="product-form-field">
                  <span>
                    {esEdicion
                      ? "Nueva contraseña"
                      : "Contraseña"}
                  </span>

                  <div className="password-input-wrapper">
                    <input
                      type={
                        mostrarPassword
                          ? "text"
                          : "password"
                      }
                      name="password"
                      value={formulario.password}
                      onChange={actualizarCampo}
                      placeholder={
                        esEdicion
                          ? "Dejar vacía para conservarla"
                          : "Mínimo 8 caracteres"
                      }
                      autoComplete="new-password"
                      minLength={
                        esEdicion ? undefined : 8
                      }
                      required={!esEdicion}
                      disabled={guardando}
                    />

                    <button
                      type="button"
                      className="password-toggle-button"
                      onClick={() =>
                        setMostrarPassword(
                          (valorActual) =>
                            !valorActual,
                        )
                      }
                      aria-label={
                        mostrarPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      disabled={guardando}
                    >
                      {mostrarPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  <small>
                    {esEdicion
                      ? "Déjala vacía para mantener la contraseña actual."
                      : "Debe contener al menos 8 caracteres."}
                  </small>
                </label>

                <label className="product-form-field">
                  <span>Rol</span>

                  <select
                    name="rolId"
                    value={formulario.rolId}
                    onChange={actualizarCampo}
                    required
                    disabled={guardando}
                  >
                    <option value="">
                      Selecciona un rol
                    </option>

                    {roles.map((rol) => (
                      <option
                        key={rol.id}
                        value={rol.id}
                      >
                        {rol.nombre}
                      </option>
                    ))}
                  </select>

                  {!esSuperAdministrador && (
                    <small>
                      Un Administrador solo puede
                      gestionar usuarios Vendedor.
                    </small>
                  )}
                </label>

                {esSuperAdministrador && (
                  <label className="product-form-field product-form-field-full">
                    <span>Empresa</span>

                    <select
                      name="empresaId"
                      value={formulario.empresaId}
                      onChange={actualizarCampo}
                      required
                      disabled={guardando}
                    >
                      <option value="">
                        Selecciona una empresa
                      </option>

                      {empresasActivas.map(
                        (empresa) => (
                          <option
                            key={empresa.id}
                            value={empresa.id}
                          >
                            {empresa.nombre} —{" "}
                            {empresa.rut}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                )}
              </div>

              <footer className="product-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onCancelar}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="dashboard-primary-button"
                  disabled={guardando}
                >
                  {guardando ? (
                    <>
                      <LoaderCircle
                        className="spinner"
                        size={19}
                      />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={19} />

                      {esEdicion
                        ? "Guardar cambios"
                        : "Guardar usuario"}
                    </>
                  )}
                </button>
              </footer>
            </>
          )}
        </form>
      </section>
    </div>
  );
}

export default UserForm;