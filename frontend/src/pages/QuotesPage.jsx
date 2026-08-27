import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Send,
  ShoppingCart,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import QuoteForm from "../components/QuoteForm";
import { apiRequest } from "../services/api";

function QuotesPage({
  sesion,
  onLogout,
  onNavigate,
}) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] =
    useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [cotizacionEditar, setCotizacionEditar] =
    useState(null);

  const [procesandoEstado, setProcesandoEstado] =
    useState(null);

  const [procesandoVenta, setProcesandoVenta] =
    useState(null);

  useEffect(() => {
    const cargarCotizaciones = async () => {
      setCargando(true);
      setError("");

      try {
        const resultado = await apiRequest(
          "/cotizaciones",
        );

        setCotizaciones(
          resultado?.data?.cotizaciones || [],
        );
      } catch (errorSolicitud) {
        if (errorSolicitud.status === 401) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cargar las cotizaciones.",
        );
      } finally {
        setCargando(false);
      }
    };

    cargarCotizaciones();
  }, [onLogout]);

  const cotizacionesFiltradas = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    if (!texto) {
      return cotizaciones;
    }

    return cotizaciones.filter((cotizacion) => {
      const campos = [
        cotizacion.numero,
        cotizacion.estado,
        cotizacion.cliente?.nombre,
        cotizacion.cliente?.rut,
        cotizacion.usuario?.nombre,
      ];

      return campos.some((campo) =>
        String(campo || "")
          .toLowerCase()
          .includes(texto),
      );
    });
  }, [busqueda, cotizaciones]);

  const formatearPrecio = (valor) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) {
      return "Sin vencimiento";
    }

    return new Date(fecha).toLocaleDateString(
      "es-CL",
    );
  };

  const abrirCreacion = () => {
    setError("");
    setMensajeExito("");
    setCotizacionEditar(null);
    setMostrarFormulario(true);
  };

  const abrirEdicion = (cotizacion) => {
    setError("");
    setMensajeExito("");
    setCotizacionEditar(cotizacion);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setCotizacionEditar(null);
  };

  const manejarCreada = (
    cotizacion,
    mensaje,
  ) => {
    setCotizaciones((actuales) => [
      cotizacion,
      ...actuales,
    ]);

    setMensajeExito(
      mensaje ||
        "Cotización creada correctamente.",
    );

    cerrarFormulario();
  };

  const manejarActualizada = (
    cotizacion,
    mensaje,
  ) => {
    setCotizaciones((actuales) =>
      actuales.map((actual) =>
        actual.id === cotizacion.id
          ? cotizacion
          : actual,
      ),
    );

    setMensajeExito(
      mensaje ||
        "Cotización actualizada correctamente.",
    );

    cerrarFormulario();
  };

  const cambiarEstado = async (
    cotizacion,
    estado,
  ) => {
    setProcesandoEstado(cotizacion.id);
    setError("");
    setMensajeExito("");

    try {
      const resultado = await apiRequest(
        `/cotizaciones/${cotizacion.id}/estado`,
        {
          method: "PATCH",
          body: JSON.stringify({
            estado,
          }),
        },
      );

      const cotizacionActualizada =
        resultado.data.cotizacion;

      setCotizaciones((actuales) =>
        actuales.map((actual) =>
          actual.id ===
          cotizacionActualizada.id
            ? cotizacionActualizada
            : actual,
        ),
      );

      setMensajeExito(
        resultado.message ||
          "Estado actualizado correctamente.",
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible cambiar el estado de la cotización.",
      );
    } finally {
      setProcesandoEstado(null);
    }
  };

  const convertirEnVenta = async (cotizacion) => {
    const confirmar = window.confirm(
      `¿Deseas convertir ${cotizacion.numero} en una venta?\n\nSe validará el stock y, si todo está correcto, los productos serán descontados del inventario.`,
    );

    if (!confirmar) {
      return;
    }

    setProcesandoVenta(cotizacion.id);
    setError("");
    setMensajeExito("");

    try {
      const resultado = await apiRequest(
        `/ventas/desde-cotizacion/${cotizacion.id}`,
        {
          method: "POST",
        },
      );

      const venta = resultado?.data?.venta;

      setCotizaciones((actuales) =>
        actuales.map((actual) =>
          actual.id === cotizacion.id
            ? {
                ...actual,
                estado: "CONVERTIDA",
              }
            : actual,
        ),
      );

      setMensajeExito(
        venta?.numero
          ? `${cotizacion.numero} fue convertida correctamente en ${venta.numero}.`
          : resultado.message ||
              "Cotización convertida en venta correctamente.",
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible convertir la cotización en venta.",
      );
    } finally {
      setProcesandoVenta(null);
    }
  };

  const obtenerClaseEstado = (estado) => {
    const clases = {
      BORRADOR:
        "quote-status quote-status-draft",
      ENVIADA:
        "quote-status quote-status-sent",
      ACEPTADA:
        "quote-status quote-status-accepted",
      RECHAZADA:
        "quote-status quote-status-rejected",
      VENCIDA:
        "quote-status quote-status-expired",
      CONVERTIDA:
        "quote-status quote-status-converted",
    };

    return (
      clases[estado] ||
      "quote-status quote-status-draft"
    );
  };

  return (
    <AppLayout
      sesion={sesion}
      onLogout={onLogout}
      activeSection="cotizaciones"
      onNavigate={onNavigate}
    >
      <section className="page-heading products-heading">
        <div>
          <p className="page-eyebrow">
            Gestión comercial
          </p>

          <h1>Cotizaciones</h1>

          <p>
            Crea propuestas comerciales para tus
            clientes y gestiona su estado.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-primary-button"
          onClick={abrirCreacion}
        >
          <Plus size={19} />
          Nueva cotización
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
              <FileText size={22} />
            </div>

            <div>
              <span>
                Cotizaciones registradas
              </span>

              <strong>
                {cotizaciones.length}
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
              placeholder="Buscar por número, cliente, RUT o estado"
              aria-label="Buscar cotizaciones"
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
              Cargando cotizaciones...
            </p>
          </div>
        ) : cotizacionesFiltradas.length ===
          0 ? (
          <div className="empty-dashboard-state">
            <TriangleAlert size={34} />

            <strong>
              {cotizaciones.length === 0
                ? "No hay cotizaciones registradas"
                : "No se encontraron resultados"}
            </strong>

            <p>
              {cotizaciones.length === 0
                ? "Las propuestas comerciales aparecerán en esta sección."
                : "Prueba utilizando otro número, cliente, RUT o estado."}
            </p>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table quote-table">
              <thead>
                <tr>
                  <th>Cotización</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cotizacionesFiltradas.map(
                  (cotizacion) => (
                    <tr key={cotizacion.id}>
                      <td>
                        <div className="user-main-data">
                          <strong>
                            {cotizacion.numero}
                          </strong>

                          <small>
                            {cotizacion.usuario
                              ?.nombre ||
                              "Usuario no disponible"}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="user-main-data">
                          <strong>
                            {cotizacion.cliente
                              ?.nombre ||
                              "Cliente no disponible"}
                          </strong>

                          <small>
                            {cotizacion.cliente
                              ?.rut || ""}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="user-main-data">
                          <small>
                            Creada:{" "}
                            {formatearFecha(
                              cotizacion.fechaCreacion,
                            )}
                          </small>

                          <small>
                            Vence:{" "}
                            {formatearFecha(
                              cotizacion.fechaVencimiento,
                            )}
                          </small>
                        </div>
                      </td>

                      <td>
                        <strong>
                          {formatearPrecio(
                            cotizacion.total,
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={obtenerClaseEstado(
                            cotizacion.estado,
                          )}
                        >
                          {cotizacion.estado}
                        </span>
                      </td>

                      <td>
                        <div className="product-actions quote-actions">
                          {cotizacion.estado ===
                            "BORRADOR" && (
                            <>
                              <button
                                type="button"
                                className="product-edit-button"
                                onClick={() =>
                                  abrirEdicion(
                                    cotizacion,
                                  )
                                }
                              >
                                <Pencil
                                  size={17}
                                />
                                Editar
                              </button>

                              <button
                                type="button"
                                className="quote-action-button"
                                onClick={() =>
                                  cambiarEstado(
                                    cotizacion,
                                    "ENVIADA",
                                  )
                                }
                                disabled={
                                  procesandoEstado ===
                                  cotizacion.id
                                }
                              >
                                <Send
                                  size={17}
                                />
                                Enviar
                              </button>
                            </>
                          )}

                          {cotizacion.estado ===
                            "ENVIADA" && (
                            <>
                              <button
                                type="button"
                                className="quote-action-button quote-action-success"
                                onClick={() =>
                                  cambiarEstado(
                                    cotizacion,
                                    "ACEPTADA",
                                  )
                                }
                                disabled={
                                  procesandoEstado ===
                                  cotizacion.id
                                }
                              >
                                <CheckCircle2
                                  size={17}
                                />
                                Aceptar
                              </button>

                              <button
                                type="button"
                                className="quote-action-button quote-action-danger"
                                onClick={() =>
                                  cambiarEstado(
                                    cotizacion,
                                    "RECHAZADA",
                                  )
                                }
                                disabled={
                                  procesandoEstado ===
                                  cotizacion.id
                                }
                              >
                                <XCircle
                                  size={17}
                                />
                                Rechazar
                              </button>

                              <button
                                type="button"
                                className="quote-action-button quote-action-warning"
                                onClick={() =>
                                  cambiarEstado(
                                    cotizacion,
                                    "VENCIDA",
                                  )
                                }
                                disabled={
                                  procesandoEstado ===
                                  cotizacion.id
                                }
                              >
                                <Clock3
                                  size={17}
                                />
                                Vencida
                              </button>
                            </>
                          )}

                          {cotizacion.estado ===
                            "ACEPTADA" && (
                            <button
                              type="button"
                              className="quote-action-button quote-action-success"
                              onClick={() =>
                                convertirEnVenta(
                                  cotizacion,
                                )
                              }
                              disabled={
                                procesandoVenta ===
                                cotizacion.id
                              }
                            >
                              {procesandoVenta ===
                              cotizacion.id ? (
                                <LoaderCircle
                                  className="spinner"
                                  size={17}
                                />
                              ) : (
                                <ShoppingCart
                                  size={17}
                                />
                              )}

                              Convertir en venta
                            </button>
                          )}

                          {[
                            "RECHAZADA",
                            "VENCIDA",
                            "CONVERTIDA",
                          ].includes(
                            cotizacion.estado,
                          ) && (
                            <span className="user-action-restriction">
                              Sin acciones pendientes
                            </span>
                          )}
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
        <QuoteForm
          cotizacionEditar={
            cotizacionEditar
          }
          onCancelar={cerrarFormulario}
          onCotizacionCreada={
            manejarCreada
          }
          onCotizacionActualizada={
            manejarActualizada
          }
          onLogout={onLogout}
        />
      )}
    </AppLayout>
  );
}

export default QuotesPage;