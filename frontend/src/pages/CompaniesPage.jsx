import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  PowerOff,
  Search,
  TriangleAlert,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import CompanyForm from "../components/CompanyForm";
import ConfirmDialog from "../components/ConfirmDialog";
import { apiRequest } from "../services/api";

function CompaniesPage({
  sesion,
  onLogout,
  onNavigate,
}) {
  const [empresas, setEmpresas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] =
    useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [empresaEditar, setEmpresaEditar] =
    useState(null);

  const [empresaEstado, setEmpresaEstado] =
    useState(null);

  const [procesandoEstado, setProcesandoEstado] =
    useState(false);

  const nombreRolSesion =
    sesion.rol?.nombre ||
    sesion.usuario?.rol?.nombre ||
    "";

  const esSuperAdministrador =
    nombreRolSesion === "SuperAdministrador";

  useEffect(() => {
    const cargarEmpresas = async () => {
      setCargando(true);
      setError("");

      try {
        const resultado = await apiRequest(
          "/empresas",
        );

        setEmpresas(
          resultado?.data?.empresas || [],
        );
      } catch (errorSolicitud) {
        if (errorSolicitud.status === 401) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cargar las empresas.",
        );
      } finally {
        setCargando(false);
      }
    };

    cargarEmpresas();
  }, [onLogout]);

  const empresasFiltradas = useMemo(() => {
    const textoBusqueda = busqueda
      .trim()
      .toLowerCase();

    if (!textoBusqueda) {
      return empresas;
    }

    return empresas.filter((empresa) => {
      const camposBusqueda = [
        empresa.nombre,
        empresa.rut,
        empresa.correo,
        empresa.telefono,
        empresa.direccion,
        empresa.estado ? "activa" : "inactiva",
      ];

      return camposBusqueda.some((campo) =>
        String(campo || "")
          .toLowerCase()
          .includes(textoBusqueda),
      );
    });
  }, [busqueda, empresas]);

  const ordenarEmpresas = (listaEmpresas) => {
    return [...listaEmpresas].sort(
      (empresaA, empresaB) =>
        empresaA.nombre.localeCompare(
          empresaB.nombre,
          "es",
        ),
    );
  };

  const abrirFormularioCreacion = () => {
    setError("");
    setMensajeExito("");
    setEmpresaEditar(null);
    setMostrarFormulario(true);
  };

  const abrirFormularioEdicion = (empresa) => {
    setError("");
    setMensajeExito("");
    setEmpresaEditar(empresa);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setEmpresaEditar(null);
  };

  const manejarEmpresaCreada = (
    empresaCreada,
    mensaje,
  ) => {
    setEmpresas((empresasActuales) =>
      ordenarEmpresas([
        ...empresasActuales,
        empresaCreada,
      ]),
    );

    setMensajeExito(
      mensaje ||
        "Empresa registrada correctamente.",
    );

    cerrarFormulario();
  };

  const manejarEmpresaActualizada = (
    empresaActualizada,
    mensaje,
  ) => {
    setEmpresas((empresasActuales) =>
      ordenarEmpresas(
        empresasActuales.map((empresa) =>
          empresa.id === empresaActualizada.id
            ? empresaActualizada
            : empresa,
        ),
      ),
    );

    setMensajeExito(
      mensaje ||
        "Empresa actualizada correctamente.",
    );

    cerrarFormulario();
  };

  const abrirConfirmacionEstado = (empresa) => {
    setError("");
    setMensajeExito("");
    setEmpresaEstado(empresa);
  };

  const cerrarConfirmacionEstado = () => {
    setEmpresaEstado(null);
  };

  const confirmarCambioEstado = async () => {
    if (!empresaEstado) {
      return;
    }

    setProcesandoEstado(true);
    setError("");

    try {
      const estaActiva = empresaEstado.estado;

      const ruta = estaActiva
        ? `/empresas/${empresaEstado.id}`
        : `/empresas/${empresaEstado.id}/reactivar`;

      const resultado = await apiRequest(ruta, {
        method: estaActiva ? "DELETE" : "PATCH",
      });

      const empresaActualizada =
        resultado.data.empresa;

      setEmpresas((empresasActuales) =>
        empresasActuales.map((empresa) =>
          empresa.id === empresaActualizada.id
            ? empresaActualizada
            : empresa,
        ),
      );

      setMensajeExito(
        resultado.message ||
          (estaActiva
            ? "Empresa desactivada correctamente."
            : "Empresa reactivada correctamente."),
      );

      cerrarConfirmacionEstado();
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible cambiar el estado de la empresa.",
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
      activeSection="empresas"
      onNavigate={onNavigate}
    >
      <section className="page-heading products-heading">
        <div>
          <p className="page-eyebrow">
            Administración multiempresa
          </p>

          <h1>Empresas</h1>

          <p>
            Administra las organizaciones registradas
            y habilitadas para utilizar el sistema.
          </p>
        </div>

        {esSuperAdministrador && (
          <button
            type="button"
            className="dashboard-primary-button"
            onClick={abrirFormularioCreacion}
          >
            <Plus size={19} />
            Registrar empresa
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
              <Building2 size={22} />
            </div>

            <div>
              <span>Empresas registradas</span>
              <strong>{empresas.length}</strong>
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
              placeholder="Buscar por nombre, RUT, correo o dirección"
              aria-label="Buscar empresas"
            />
          </label>
        </div>

        {cargando ? (
          <div className="products-loading">
            <LoaderCircle
              className="spinner"
              size={36}
            />

            <p>Cargando empresas...</p>
          </div>
        ) : empresasFiltradas.length === 0 ? (
          <div className="empty-dashboard-state">
            <TriangleAlert size={34} />

            <strong>
              {empresas.length === 0
                ? "No hay empresas registradas"
                : "No se encontraron resultados"}
            </strong>

            <p>
              {empresas.length === 0
                ? "Las organizaciones registradas aparecerán en esta sección."
                : "Prueba utilizando otro nombre, RUT, correo o dirección."}
            </p>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table users-table companies-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Contacto</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {empresasFiltradas.map((empresa) => (
                  <tr key={empresa.id}>
                    <td>
                      <div className="product-name-cell">
                        <div className="product-table-icon">
                          <Building2 size={18} />
                        </div>

                        <div className="user-main-data">
                          <strong>
                            {empresa.nombre}
                          </strong>

                          <small>{empresa.rut}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="user-main-data">
                        <small>
                          <Mail size={14} />
                          {empresa.correo}
                        </small>

                        <small>
                          <Phone size={14} />
                          {empresa.telefono ||
                            "Sin teléfono"}
                        </small>
                      </div>
                    </td>

                    <td>
                      <div className="user-company-data">
                        <MapPin size={16} />

                        <span>
                          {empresa.direccion ||
                            "Sin dirección"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={
                          empresa.estado
                            ? "product-status product-status-active"
                            : "product-status product-status-inactive"
                        }
                      >
                        {empresa.estado
                          ? "Activa"
                          : "Inactiva"}
                      </span>
                    </td>

                    <td>
                      {esSuperAdministrador ? (
                        <div className="product-actions">
                          <button
                            type="button"
                            className="product-edit-button"
                            onClick={() =>
                              abrirFormularioEdicion(
                                empresa,
                              )
                            }
                            aria-label={`Editar ${empresa.nombre}`}
                          >
                            <Pencil size={17} />
                            Editar
                          </button>

                          <button
                            type="button"
                            className={
                              empresa.estado
                                ? "product-state-button product-state-button-danger"
                                : "product-state-button product-state-button-success"
                            }
                            onClick={() =>
                              abrirConfirmacionEstado(
                                empresa,
                              )
                            }
                            aria-label={
                              empresa.estado
                                ? `Desactivar ${empresa.nombre}`
                                : `Reactivar ${empresa.nombre}`
                            }
                          >
                            {empresa.estado ? (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarFormulario && (
        <CompanyForm
          empresaEditar={empresaEditar}
          onCancelar={cerrarFormulario}
          onEmpresaCreada={manejarEmpresaCreada}
          onEmpresaActualizada={
            manejarEmpresaActualizada
          }
          onLogout={onLogout}
        />
      )}

      {empresaEstado && (
        <ConfirmDialog
          elemento={empresaEstado}
          tipo="empresa"
          procesando={procesandoEstado}
          onCancelar={cerrarConfirmacionEstado}
          onConfirmar={confirmarCambioEstado}
        />
      )}
    </AppLayout>
  );
}

export default CompaniesPage;