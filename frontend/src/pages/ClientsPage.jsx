import { useEffect, useMemo, useState } from "react";
import {
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
  UserRound,
  Users,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import ClientForm from "../components/ClientForm";
import ConfirmDialog from "../components/ConfirmDialog";
import { apiRequest } from "../services/api";

function ClientsPage({
  sesion,
  onLogout,
  onNavigate,
}) {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] =
    useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [clienteEditar, setClienteEditar] =
    useState(null);

  const [clienteEstado, setClienteEstado] =
    useState(null);

  const [procesandoEstado, setProcesandoEstado] =
    useState(false);

  const nombreRol =
    sesion.rol?.nombre ||
    sesion.usuario?.rol?.nombre ||
    "";

  const puedeAdministrarClientes =
    nombreRol === "Administrador";

  useEffect(() => {
    const cargarClientes = async () => {
      setCargando(true);
      setError("");

      try {
        const resultado = await apiRequest(
          "/clientes",
        );

        setClientes(
          resultado?.data?.clientes || [],
        );
      } catch (errorSolicitud) {
        if (errorSolicitud.status === 401) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cargar los clientes.",
        );
      } finally {
        setCargando(false);
      }
    };

    cargarClientes();
  }, [onLogout]);

  const clientesFiltrados = useMemo(() => {
    const textoBusqueda = busqueda
      .trim()
      .toLowerCase();

    if (!textoBusqueda) {
      return clientes;
    }

    return clientes.filter((cliente) => {
      const camposBusqueda = [
        cliente.nombre,
        cliente.rut,
        cliente.correo,
        cliente.telefono,
        cliente.direccion,
      ];

      return camposBusqueda.some((campo) =>
        String(campo || "")
          .toLowerCase()
          .includes(textoBusqueda),
      );
    });
  }, [busqueda, clientes]);

  const ordenarClientes = (listaClientes) => {
    return [...listaClientes].sort(
      (clienteA, clienteB) =>
        clienteA.nombre.localeCompare(
          clienteB.nombre,
          "es",
        ),
    );
  };

  const abrirFormularioCreacion = () => {
    setError("");
    setMensajeExito("");
    setClienteEditar(null);
    setMostrarFormulario(true);
  };

  const abrirFormularioEdicion = (cliente) => {
    setError("");
    setMensajeExito("");
    setClienteEditar(cliente);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setClienteEditar(null);
  };

  const manejarClienteCreado = (
    clienteCreado,
    mensaje,
  ) => {
    setClientes((clientesActuales) =>
      ordenarClientes([
        ...clientesActuales,
        clienteCreado,
      ]),
    );

    setMensajeExito(
      mensaje || "Cliente creado correctamente.",
    );

    cerrarFormulario();
  };

  const manejarClienteActualizado = (
    clienteActualizado,
    mensaje,
  ) => {
    setClientes((clientesActuales) =>
      ordenarClientes(
        clientesActuales.map((cliente) =>
          cliente.id === clienteActualizado.id
            ? clienteActualizado
            : cliente,
        ),
      ),
    );

    setMensajeExito(
      mensaje ||
        "Cliente actualizado correctamente.",
    );

    cerrarFormulario();
  };

  const abrirConfirmacionEstado = (cliente) => {
    setError("");
    setMensajeExito("");
    setClienteEstado(cliente);
  };

  const cerrarConfirmacionEstado = () => {
    setClienteEstado(null);
  };

  const confirmarCambioEstado = async () => {
    if (!clienteEstado) {
      return;
    }

    setProcesandoEstado(true);
    setError("");

    try {
      const estaActivo = clienteEstado.estado;

      const ruta = estaActivo
        ? `/clientes/${clienteEstado.id}`
        : `/clientes/${clienteEstado.id}/reactivar`;

      const resultado = await apiRequest(ruta, {
        method: estaActivo ? "DELETE" : "PATCH",
      });

      const clienteActualizado =
        resultado.data.cliente;

      setClientes((clientesActuales) =>
        clientesActuales.map((cliente) =>
          cliente.id === clienteActualizado.id
            ? clienteActualizado
            : cliente,
        ),
      );

      setMensajeExito(
        resultado.message ||
          (estaActivo
            ? "Cliente desactivado correctamente."
            : "Cliente reactivado correctamente."),
      );

      cerrarConfirmacionEstado();
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible cambiar el estado del cliente.",
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
      activeSection="clientes"
      onNavigate={onNavigate}
    >
      <section className="page-heading products-heading">
        <div>
          <p className="page-eyebrow">
            Gestión comercial
          </p>

          <h1>Clientes</h1>

          <p>
            Administra los clientes asociados a la
            empresa y su información de contacto.
          </p>
        </div>

        {puedeAdministrarClientes && (
          <button
            type="button"
            className="dashboard-primary-button"
            onClick={abrirFormularioCreacion}
          >
            <Plus size={19} />
            Registrar cliente
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
              <span>Clientes registrados</span>
              <strong>{clientes.length}</strong>
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
              placeholder="Buscar por nombre, RUT o contacto"
              aria-label="Buscar clientes"
            />
          </label>
        </div>

        {cargando ? (
          <div className="products-loading">
            <LoaderCircle
              className="spinner"
              size={36}
            />

            <p>Cargando clientes...</p>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="empty-dashboard-state">
            <TriangleAlert size={34} />

            <strong>
              {clientes.length === 0
                ? "No hay clientes registrados"
                : "No se encontraron resultados"}
            </strong>

            <p>
              {clientes.length === 0
                ? "Los clientes registrados aparecerán en esta sección."
                : "Prueba utilizando otro nombre, RUT o dato de contacto."}
            </p>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table clients-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Dirección</th>
                  <th>Estado</th>

                  {puedeAdministrarClientes && (
                    <th>Acciones</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>
                      <div className="product-name-cell">
                        <div className="product-table-icon">
                          <UserRound size={18} />
                        </div>

                        <div>
                          <strong>
                            {cliente.nombre}
                          </strong>

                          <small className="client-secondary-text">
                            RUT: {cliente.rut}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="client-contact-data">
                        <span>
                          <Mail size={15} />
                          {cliente.correo ||
                            "Sin correo"}
                        </span>

                        <span>
                          <Phone size={15} />
                          {cliente.telefono ||
                            "Sin teléfono"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="client-address">
                        <MapPin size={15} />

                        <span>
                          {cliente.direccion ||
                            "Sin dirección"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={
                          cliente.estado
                            ? "product-status product-status-active"
                            : "product-status product-status-inactive"
                        }
                      >
                        {cliente.estado
                          ? "Activo"
                          : "Inactivo"}
                      </span>
                    </td>

                    {puedeAdministrarClientes && (
                      <td>
                        <div className="product-actions">
                          <button
                            type="button"
                            className="product-edit-button"
                            onClick={() =>
                              abrirFormularioEdicion(
                                cliente,
                              )
                            }
                            aria-label={`Editar ${cliente.nombre}`}
                          >
                            <Pencil size={17} />
                            Editar
                          </button>

                          <button
                            type="button"
                            className={
                              cliente.estado
                                ? "product-state-button product-state-button-danger"
                                : "product-state-button product-state-button-success"
                            }
                            onClick={() =>
                              abrirConfirmacionEstado(
                                cliente,
                              )
                            }
                            aria-label={
                              cliente.estado
                                ? `Desactivar ${cliente.nombre}`
                                : `Reactivar ${cliente.nombre}`
                            }
                          >
                            {cliente.estado ? (
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
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarFormulario && (
        <ClientForm
          clienteEditar={clienteEditar}
          onCancelar={cerrarFormulario}
          onClienteCreado={manejarClienteCreado}
          onClienteActualizado={
            manejarClienteActualizado
          }
          onLogout={onLogout}
        />
      )}

      {clienteEstado && (
        <ConfirmDialog
          elemento={clienteEstado}
          tipo="cliente"
          procesando={procesandoEstado}
          onCancelar={cerrarConfirmacionEstado}
          onConfirmar={confirmarCambioEstado}
        />
      )}
    </AppLayout>
  );
}

export default ClientsPage;