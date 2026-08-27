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
  Truck,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import SupplierForm from "../components/SupplierForm";
import ConfirmDialog from "../components/ConfirmDialog";
import { apiRequest } from "../services/api";

function SuppliersPage({
  sesion,
  onLogout,
  onNavigate,
}) {
  const [proveedores, setProveedores] =
    useState([]);

  const [busqueda, setBusqueda] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mensajeExito, setMensajeExito] =
    useState("");

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    proveedorEditar,
    setProveedorEditar,
  ] = useState(null);

  const [
    proveedorEstado,
    setProveedorEstado,
  ] = useState(null);

  const [
    procesandoEstado,
    setProcesandoEstado,
  ] = useState(false);

  useEffect(() => {
    const cargarProveedores = async () => {
      setCargando(true);
      setError("");

      try {
        const resultado =
          await apiRequest("/proveedores");

        setProveedores(
          resultado?.data?.proveedores || [],
        );
      } catch (errorSolicitud) {
        if (errorSolicitud.status === 401) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cargar los proveedores.",
        );
      } finally {
        setCargando(false);
      }
    };

    cargarProveedores();
  }, [onLogout]);

  const proveedoresFiltrados = useMemo(() => {
    const textoBusqueda = busqueda
      .trim()
      .toLowerCase();

    if (!textoBusqueda) {
      return proveedores;
    }

    return proveedores.filter(
      (proveedor) => {
        const camposBusqueda = [
          proveedor.razonSocial,
          proveedor.rut,
          proveedor.giro,
          proveedor.correo,
          proveedor.telefono,
          proveedor.direccion,
        ];

        return camposBusqueda.some((campo) =>
          String(campo || "")
            .toLowerCase()
            .includes(textoBusqueda),
        );
      },
    );
  }, [busqueda, proveedores]);

  const ordenarProveedores = (
    listaProveedores,
  ) => {
    return [...listaProveedores].sort(
      (proveedorA, proveedorB) =>
        proveedorA.razonSocial.localeCompare(
          proveedorB.razonSocial,
          "es",
        ),
    );
  };

  const abrirFormularioCreacion = () => {
    setError("");
    setMensajeExito("");
    setProveedorEditar(null);
    setMostrarFormulario(true);
  };

  const abrirFormularioEdicion = (
    proveedor,
  ) => {
    setError("");
    setMensajeExito("");
    setProveedorEditar(proveedor);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setProveedorEditar(null);
  };

  const manejarProveedorCreado = (
    proveedorCreado,
    mensaje,
  ) => {
    setProveedores(
      (proveedoresActuales) =>
        ordenarProveedores([
          ...proveedoresActuales,
          proveedorCreado,
        ]),
    );

    setMensajeExito(
      mensaje ||
        "Proveedor creado correctamente.",
    );

    cerrarFormulario();
  };

  const manejarProveedorActualizado = (
    proveedorActualizado,
    mensaje,
  ) => {
    setProveedores(
      (proveedoresActuales) =>
        ordenarProveedores(
          proveedoresActuales.map(
            (proveedor) =>
              proveedor.id ===
              proveedorActualizado.id
                ? proveedorActualizado
                : proveedor,
          ),
        ),
    );

    setMensajeExito(
      mensaje ||
        "Proveedor actualizado correctamente.",
    );

    cerrarFormulario();
  };

  const abrirConfirmacionEstado = (
    proveedor,
  ) => {
    setError("");
    setMensajeExito("");
    setProveedorEstado(proveedor);
  };

  const cerrarConfirmacionEstado = () => {
    setProveedorEstado(null);
  };

  const confirmarCambioEstado =
    async () => {
      if (!proveedorEstado) {
        return;
      }

      setProcesandoEstado(true);
      setError("");

      try {
        const nuevoEstado =
          !proveedorEstado.estado;

        const resultado =
          await apiRequest(
            `/proveedores/${proveedorEstado.id}/estado`,
            {
              method: "PATCH",
              body: JSON.stringify({
                estado: nuevoEstado,
              }),
            },
          );

        const proveedorActualizado =
          resultado.data.proveedor;

        setProveedores(
          (proveedoresActuales) =>
            proveedoresActuales.map(
              (proveedor) =>
                proveedor.id ===
                proveedorActualizado.id
                  ? proveedorActualizado
                  : proveedor,
            ),
        );

        setMensajeExito(
          resultado.message ||
            (nuevoEstado
              ? "Proveedor activado correctamente."
              : "Proveedor desactivado correctamente."),
        );

        cerrarConfirmacionEstado();
      } catch (errorSolicitud) {
        if (
          errorSolicitud.status === 401
        ) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cambiar el estado del proveedor.",
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
      activeSection="proveedores"
      onNavigate={onNavigate}
    >
      <section className="page-heading products-heading">
        <div>
          <p className="page-eyebrow">
            Gestión de compras
          </p>

          <h1>Proveedores</h1>

          <p>
            Administra los proveedores asociados
            a la empresa y su información
            comercial.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-primary-button"
          onClick={abrirFormularioCreacion}
        >
          <Plus size={19} />
          Registrar proveedor
        </button>
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
              <Truck size={22} />
            </div>

            <div>
              <span>
                Proveedores registrados
              </span>

              <strong>
                {proveedores.length}
              </strong>
            </div>
          </div>

          <label className="products-search">
            <Search size={19} />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value,
                )
              }
              placeholder="Buscar por razón social, RUT, giro o contacto"
              aria-label="Buscar proveedores"
            />
          </label>
        </div>

        {cargando ? (
          <div className="products-loading">
            <LoaderCircle
              className="spinner"
              size={36}
            />

            <p>
              Cargando proveedores...
            </p>
          </div>
        ) : proveedoresFiltrados.length ===
          0 ? (
          <div className="empty-dashboard-state">
            <TriangleAlert size={34} />

            <strong>
              {proveedores.length === 0
                ? "No hay proveedores registrados"
                : "No se encontraron resultados"}
            </strong>

            <p>
              {proveedores.length === 0
                ? "Los proveedores registrados aparecerán en esta sección."
                : "Prueba utilizando otra razón social, RUT, giro o dato de contacto."}
            </p>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table clients-table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Giro</th>
                  <th>Contacto</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {proveedoresFiltrados.map(
                  (proveedor) => (
                    <tr key={proveedor.id}>
                      <td>
                        <div className="product-name-cell">
                          <div className="product-table-icon">
                            <Building2
                              size={18}
                            />
                          </div>

                          <div>
                            <strong>
                              {
                                proveedor.razonSocial
                              }
                            </strong>

                            <small className="client-secondary-text">
                              RUT:{" "}
                              {proveedor.rut}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span>
                          {proveedor.giro ||
                            "Sin giro informado"}
                        </span>
                      </td>

                      <td>
                        <div className="client-contact-data">
                          <span>
                            <Mail size={15} />

                            {proveedor.correo ||
                              "Sin correo"}
                          </span>

                          <span>
                            <Phone size={15} />

                            {proveedor.telefono ||
                              "Sin teléfono"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="client-address">
                          <MapPin size={15} />

                          <span>
                            {proveedor.direccion ||
                              "Sin dirección"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={
                            proveedor.estado
                              ? "product-status product-status-active"
                              : "product-status product-status-inactive"
                          }
                        >
                          {proveedor.estado
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </td>

                      <td>
                        <div className="product-actions">
                          <button
                            type="button"
                            className="product-edit-button"
                            onClick={() =>
                              abrirFormularioEdicion(
                                proveedor,
                              )
                            }
                            aria-label={`Editar ${proveedor.razonSocial}`}
                          >
                            <Pencil
                              size={17}
                            />
                            Editar
                          </button>

                          <button
                            type="button"
                            className={
                              proveedor.estado
                                ? "product-state-button product-state-button-danger"
                                : "product-state-button product-state-button-success"
                            }
                            onClick={() =>
                              abrirConfirmacionEstado(
                                proveedor,
                              )
                            }
                            aria-label={
                              proveedor.estado
                                ? `Desactivar ${proveedor.razonSocial}`
                                : `Activar ${proveedor.razonSocial}`
                            }
                          >
                            {proveedor.estado ? (
                              <>
                                <PowerOff
                                  size={17}
                                />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Power
                                  size={17}
                                />
                                Activar
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarFormulario && (
        <SupplierForm
          proveedorEditar={
            proveedorEditar
          }
          onCancelar={
            cerrarFormulario
          }
          onProveedorCreado={
            manejarProveedorCreado
          }
          onProveedorActualizado={
            manejarProveedorActualizado
          }
          onLogout={onLogout}
        />
      )}

      {proveedorEstado && (
        <ConfirmDialog
          elemento={proveedorEstado}
          tipo="proveedor"
          procesando={
            procesandoEstado
          }
          onCancelar={
            cerrarConfirmacionEstado
          }
          onConfirmar={
            confirmarCambioEstado
          }
        />
      )}
    </AppLayout>
  );
}

export default SuppliersPage;