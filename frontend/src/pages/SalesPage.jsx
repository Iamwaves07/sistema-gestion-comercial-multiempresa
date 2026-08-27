import { useEffect, useMemo, useState } from "react";
import {
  LoaderCircle,
  Search,
  ShoppingCart,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { apiRequest } from "../services/api";

function SalesPage({
  sesion,
  onLogout,
  onNavigate,
}) {
  const [ventas, setVentas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] =
    useState("");

  const [procesandoVenta, setProcesandoVenta] =
    useState(null);

  useEffect(() => {
    const cargarVentas = async () => {
      setCargando(true);
      setError("");

      try {
        const resultado = await apiRequest(
          "/ventas",
        );

        setVentas(
          resultado?.data?.ventas || [],
        );
      } catch (errorSolicitud) {
        if (errorSolicitud.status === 401) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cargar las ventas.",
        );
      } finally {
        setCargando(false);
      }
    };

    cargarVentas();
  }, [onLogout]);

  const ventasFiltradas = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    if (!texto) {
      return ventas;
    }

    return ventas.filter((venta) => {
      const campos = [
        venta.numero,
        venta.estado,
        venta.cliente?.nombre,
        venta.cliente?.rut,
        venta.usuario?.nombre,
        venta.cotizacion?.numero,
      ];

      return campos.some((campo) =>
        String(campo || "")
          .toLowerCase()
          .includes(texto),
      );
    });
  }, [busqueda, ventas]);

  const formatearPrecio = (valor) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) {
      return "Fecha no disponible";
    }

    return new Date(fecha).toLocaleDateString(
      "es-CL",
    );
  };

  const obtenerClaseEstado = (estado) => {
    const clases = {
      CONFIRMADA:
        "quote-status quote-status-accepted",
      ANULADA:
        "quote-status quote-status-rejected",
    };

    return (
      clases[estado] ||
      "quote-status quote-status-draft"
    );
  };

  const anularVenta = async (venta) => {
    const confirmar = window.confirm(
      `¿Seguro que deseas anular ${venta.numero}?\n\nEl stock vendido será devuelto al inventario.`,
    );

    if (!confirmar) {
      return;
    }

    setProcesandoVenta(venta.id);
    setError("");
    setMensajeExito("");

    try {
      const resultado = await apiRequest(
        `/ventas/${venta.id}/anular`,
        {
          method: "PATCH",
        },
      );

      const ventaActualizada =
        resultado.data.venta;

      setVentas((actuales) =>
        actuales.map((actual) =>
          actual.id === ventaActualizada.id
            ? ventaActualizada
            : actual,
        ),
      );

      setMensajeExito(
        resultado.message ||
          "Venta anulada correctamente.",
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible anular la venta.",
      );
    } finally {
      setProcesandoVenta(null);
    }
  };

  return (
    <AppLayout
      sesion={sesion}
      onLogout={onLogout}
      activeSection="ventas"
      onNavigate={onNavigate}
    >
      <section className="page-heading products-heading">
        <div>
          <p className="page-eyebrow">
            Gestión comercial
          </p>

          <h1>Ventas</h1>

          <p>
            Consulta las ventas generadas desde
            cotizaciones aceptadas y controla su
            estado.
          </p>
        </div>
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
              <ShoppingCart size={22} />
            </div>

            <div>
              <span>Ventas registradas</span>

              <strong>
                {ventas.length}
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
              placeholder="Buscar por venta, cliente, RUT, cotización o estado"
              aria-label="Buscar ventas"
            />
          </label>
        </div>

        {cargando ? (
          <div className="products-loading">
            <LoaderCircle
              className="spinner"
              size={36}
            />

            <p>Cargando ventas...</p>
          </div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="empty-dashboard-state">
            <TriangleAlert size={34} />

            <strong>
              {ventas.length === 0
                ? "No hay ventas registradas"
                : "No se encontraron resultados"}
            </strong>

            <p>
              {ventas.length === 0
                ? "Las cotizaciones aceptadas que sean convertidas aparecerán como ventas en esta sección."
                : "Prueba utilizando otro número de venta, cliente, RUT, cotización o estado."}
            </p>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table quote-table">
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Cliente</th>
                  <th>Origen</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {ventasFiltradas.map(
                  (venta) => (
                    <tr key={venta.id}>
                      <td>
                        <div className="user-main-data">
                          <strong>
                            {venta.numero}
                          </strong>

                          <small>
                            {venta.usuario
                              ?.nombre ||
                              "Usuario no disponible"}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="user-main-data">
                          <strong>
                            {venta.cliente
                              ?.nombre ||
                              "Cliente no disponible"}
                          </strong>

                          <small>
                            {venta.cliente
                              ?.rut || ""}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="user-main-data">
                          <strong>
                            {venta.cotizacion
                              ?.numero ||
                              "Venta directa"}
                          </strong>

                          <small>
                            {venta.cotizacion
                              ? "Cotización convertida"
                              : "Sin cotización asociada"}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="user-main-data">
                          <small>
                            {formatearFecha(
                              venta.fechaCreacion,
                            )}
                          </small>
                        </div>
                      </td>

                      <td>
                        <strong>
                          {formatearPrecio(
                            venta.total,
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={obtenerClaseEstado(
                            venta.estado,
                          )}
                        >
                          {venta.estado}
                        </span>
                      </td>

                      <td>
                        <div className="product-actions quote-actions">
                          {venta.estado ===
                          "CONFIRMADA" ? (
                            <button
                              type="button"
                              className="quote-action-button quote-action-danger"
                              onClick={() =>
                                anularVenta(
                                  venta,
                                )
                              }
                              disabled={
                                procesandoVenta ===
                                venta.id
                              }
                            >
                              {procesandoVenta ===
                              venta.id ? (
                                <LoaderCircle
                                  className="spinner"
                                  size={17}
                                />
                              ) : (
                                <XCircle
                                  size={17}
                                />
                              )}

                              Anular
                            </button>
                          ) : (
                            <span className="user-action-restriction">
                              Venta anulada
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
    </AppLayout>
  );
}

export default SalesPage;