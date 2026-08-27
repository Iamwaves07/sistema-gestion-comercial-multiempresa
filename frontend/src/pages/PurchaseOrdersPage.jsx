import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  ClipboardList,
  LoaderCircle,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Send,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import PurchaseOrderForm from "../components/PurchaseOrderForm";
import { apiRequest } from "../services/api";

function PurchaseOrdersPage({
  sesion,
  onLogout,
  onNavigate,
}) {
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [procesandoId, setProcesandoId] =
    useState(null);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [busqueda, setBusqueda] = useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [ordenEditar, setOrdenEditar] =
    useState(null);

  const cargarOrdenes = async () => {
    setCargando(true);
    setError("");

    try {
      const resultado = await apiRequest(
        "/ordenes-compra",
      );

      setOrdenes(
        resultado?.data?.ordenes || [],
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible cargar las órdenes de compra.",
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarOrdenes();
  }, []);

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) {
      return "—";
    }

    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(fecha));
  };

  const obtenerClaseEstado = (estado) => {
    const clases = {
      BORRADOR:
        "status-badge status-badge-warning",
      EMITIDA:
        "status-badge status-badge-info",
      RECIBIDA:
        "status-badge status-badge-success",
      ANULADA:
        "status-badge status-badge-danger",
    };

    return clases[estado] || "status-badge";
  };

  const ordenesFiltradas = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    if (!texto) {
      return ordenes;
    }

    return ordenes.filter((orden) => {
      const campos = [
        orden.numero,
        orden.estado,
        orden.proveedor?.razonSocial,
        orden.proveedor?.rut,
        orden.usuario?.nombre,
      ];

      return campos.some((campo) =>
        String(campo || "")
          .toLowerCase()
          .includes(texto),
      );
    });
  }, [ordenes, busqueda]);

  const abrirNuevaOrden = () => {
    setOrdenEditar(null);
    setMostrarFormulario(true);
    setError("");
    setMensaje("");
  };

  const abrirEdicion = (orden) => {
    setOrdenEditar(orden);
    setMostrarFormulario(true);
    setError("");
    setMensaje("");
  };

  const cerrarFormulario = () => {
    setOrdenEditar(null);
    setMostrarFormulario(false);
  };

  const registrarOrdenCreada = (
    orden,
    mensajeServidor,
  ) => {
    setOrdenes((actuales) => [
      orden,
      ...actuales,
    ]);

    setMensaje(
      mensajeServidor ||
        "Orden de compra creada correctamente.",
    );

    cerrarFormulario();
  };

  const registrarOrdenActualizada = (
    orden,
    mensajeServidor,
  ) => {
    setOrdenes((actuales) =>
      actuales.map((actual) =>
        actual.id === orden.id
          ? orden
          : actual,
      ),
    );

    setMensaje(
      mensajeServidor ||
        "Orden de compra actualizada correctamente.",
    );

    cerrarFormulario();
  };

  const reemplazarOrden = (orden) => {
    setOrdenes((actuales) =>
      actuales.map((actual) =>
        actual.id === orden.id
          ? orden
          : actual,
      ),
    );
  };

  const emitirOrden = async (orden) => {
    const confirmar = window.confirm(
      `¿Emitir ${orden.numero}?\n\nDespués de emitirla ya no podrá editarse.`,
    );

    if (!confirmar) {
      return;
    }

    setProcesandoId(orden.id);
    setError("");
    setMensaje("");

    try {
      const resultado = await apiRequest(
        `/ordenes-compra/${orden.id}/emitir`,
        {
          method: "PATCH",
        },
      );

      reemplazarOrden(
        resultado.data.orden,
      );

      setMensaje(
        resultado.message ||
          "Orden de compra emitida correctamente.",
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible emitir la orden de compra.",
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const recepcionarOrden = async (orden) => {
    const detalleRecepcion =
      orden.detalles
        ?.map(
          (detalle) =>
            `• ${detalle.producto?.nombre}: +${detalle.cantidad}`,
        )
        .join("\n") || "";

    const confirmar = window.confirm(
      `¿Recepcionar ${orden.numero}?\n\nEsta acción aumentará el stock y generará movimientos de inventario:\n\n${detalleRecepcion}\n\nLa recepción no puede repetirse.`,
    );

    if (!confirmar) {
      return;
    }

    setProcesandoId(orden.id);
    setError("");
    setMensaje("");

    try {
      const resultado = await apiRequest(
        `/ordenes-compra/${orden.id}/recepcionar`,
        {
          method: "PATCH",
        },
      );

      reemplazarOrden(
        resultado.data.orden,
      );

      setMensaje(
        resultado.message ||
          "Orden recepcionada y stock actualizado correctamente.",
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible recepcionar la orden de compra.",
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const anularOrden = async (orden) => {
    const confirmar = window.confirm(
      `¿Anular ${orden.numero}?\n\nLa orden quedará cerrada y no podrá continuar su flujo.`,
    );

    if (!confirmar) {
      return;
    }

    setProcesandoId(orden.id);
    setError("");
    setMensaje("");

    try {
      const resultado = await apiRequest(
        `/ordenes-compra/${orden.id}/anular`,
        {
          method: "PATCH",
        },
      );

      reemplazarOrden(
        resultado.data.orden,
      );

      setMensaje(
        resultado.message ||
          "Orden de compra anulada correctamente.",
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible anular la orden de compra.",
      );
    } finally {
      setProcesandoId(null);
    }
  };

  if (cargando) {
    return (
      <AppLayout
        sesion={sesion}
        onLogout={onLogout}
        activeSection="ordenes-compra"
        onNavigate={onNavigate}
      >
        <section className="dashboard-page">
          <div className="products-loading">
            <LoaderCircle
              className="spinner"
              size={38}
            />

            <p>
              Cargando órdenes de compra...
            </p>
          </div>
        </section>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      sesion={sesion}
      onLogout={onLogout}
      activeSection="ordenes-compra"
      onNavigate={onNavigate}
    >
      <section className="dashboard-page">
        <header className="page-header">
          <div>
            <p className="page-eyebrow">
              Abastecimiento e inventario
            </p>

            <h1>Órdenes de compra</h1>

            <p className="page-description">
              Gestiona compras a proveedores,
              controla IVA y registra la recepción
              de productos en inventario.
            </p>
          </div>

          <button
            type="button"
            className="dashboard-primary-button"
            onClick={abrirNuevaOrden}
          >
            <Plus size={19} />
            Nueva orden
          </button>
        </header>

        {error && (
          <div
            className="error-message"
            role="alert"
          >
            {error}
          </div>
        )}

        {mensaje && (
          <div
            className="success-message"
            role="status"
          >
            {mensaje}
          </div>
        )}

        <section className="products-toolbar">
          <div className="products-search">
            <Search size={19} />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value,
                )
              }
              placeholder="Buscar por orden, proveedor, RUT o estado..."
            />
          </div>

          <span className="products-count">
            {ordenesFiltradas.length}{" "}
            {ordenesFiltradas.length === 1
              ? "orden"
              : "órdenes"}
          </span>
        </section>

        {ordenes.length === 0 ? (
          <div className="empty-dashboard-state">
            <ClipboardList size={42} />

            <strong>
              Aún no existen órdenes de compra
            </strong>

            <p>
              Crea la primera orden para comenzar
              a registrar compras a proveedores.
            </p>
          </div>
        ) : ordenesFiltradas.length === 0 ? (
          <div className="empty-dashboard-state">
            <Search size={36} />

            <strong>
              No encontramos coincidencias
            </strong>

            <p>
              Prueba buscando por otro número,
              proveedor, RUT o estado.
            </p>
          </div>
        ) : (
          <div className="purchase-orders-list">
            {ordenesFiltradas.map((orden) => {
              const procesando =
                procesandoId === orden.id;

              const puedeEditar =
                orden.estado === "BORRADOR";

              const puedeEmitir =
                orden.estado === "BORRADOR";

              const puedeRecepcionar =
                orden.estado === "EMITIDA";

              const puedeAnular =
                orden.estado === "BORRADOR" ||
                orden.estado === "EMITIDA";

              return (
                <article
                  className="purchase-order-card"
                  key={orden.id}
                >
                  <div className="purchase-order-card-header">
                    <div>
                      <div className="purchase-order-number-row">
                        <ClipboardList
                          size={20}
                        />

                        <strong>
                          {orden.numero}
                        </strong>

                        <span
                          className={obtenerClaseEstado(
                            orden.estado,
                          )}
                        >
                          {orden.estado}
                        </span>
                      </div>

                      <p>
                        {orden.proveedor
                          ?.razonSocial ||
                          "Proveedor no disponible"}
                      </p>

                      <small>
                        RUT:{" "}
                        {orden.proveedor?.rut ||
                          "Sin RUT"}
                      </small>
                    </div>

                    <div className="purchase-order-total-main">
                      <span>Total</span>

                      <strong>
                        {formatearMoneda(
                          orden.total,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="purchase-order-summary">
                    <div>
                      <span>Neto</span>

                      <strong>
                        {formatearMoneda(
                          orden.subtotalNeto,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        IVA{" "}
                        {Number(
                          orden.tasaIva,
                        )}
                        %
                      </span>

                      <strong>
                        {formatearMoneda(
                          orden.montoIva,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Productos</span>

                      <strong>
                        {orden.detalles
                          ?.length || 0}
                      </strong>
                    </div>

                    <div>
                      <span>Creación</span>

                      <strong>
                        {formatearFecha(
                          orden.fechaCreacion,
                        )}
                      </strong>
                    </div>
                  </div>

                  {orden.detalles?.length >
                    0 && (
                    <div className="purchase-order-items">
                      {orden.detalles.map(
                        (detalle) => (
                          <div
                            className="purchase-order-item"
                            key={detalle.id}
                          >
                            <div>
                              <strong>
                                {detalle.producto
                                  ?.nombre ||
                                  "Producto"}
                              </strong>

                              <small>
                                {
                                  detalle.cantidad
                                }{" "}
                                unidad
                                {detalle.cantidad !==
                                1
                                  ? "es"
                                  : ""}{" "}
                                ×{" "}
                                {formatearMoneda(
                                  detalle.costoUnitarioNeto,
                                )}
                              </small>
                            </div>

                            <strong>
                              {formatearMoneda(
                                detalle.subtotalNeto,
                              )}
                            </strong>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {orden.observacion && (
                    <div className="purchase-order-observation">
                      <span>
                        Observación
                      </span>

                      <p>
                        {orden.observacion}
                      </p>
                    </div>
                  )}

                  <div className="purchase-order-meta">
                    <span>
                      Registrada por:{" "}
                      <strong>
                        {orden.usuario?.nombre ||
                          "Usuario"}
                      </strong>
                    </span>

                    {orden.fechaEmision && (
                      <span>
                        Emitida:{" "}
                        <strong>
                          {formatearFecha(
                            orden.fechaEmision,
                          )}
                        </strong>
                      </span>
                    )}

                    {orden.fechaRecepcion && (
                      <span>
                        Recepcionada:{" "}
                        <strong>
                          {formatearFecha(
                            orden.fechaRecepcion,
                          )}
                        </strong>
                      </span>
                    )}
                  </div>

                  {(puedeEditar ||
                    puedeEmitir ||
                    puedeRecepcionar ||
                    puedeAnular) && (
                    <footer className="purchase-order-actions">
                      {puedeEditar && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            abrirEdicion(
                              orden,
                            )
                          }
                          disabled={
                            procesando
                          }
                        >
                          <Pencil
                            size={16}
                          />
                          Editar
                        </button>
                      )}

                      {puedeEmitir && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            emitirOrden(
                              orden,
                            )
                          }
                          disabled={
                            procesando
                          }
                        >
                          {procesando ? (
                            <LoaderCircle
                              className="spinner"
                              size={16}
                            />
                          ) : (
                            <Send
                              size={16}
                            />
                          )}

                          Emitir
                        </button>
                      )}

                      {puedeRecepcionar && (
                        <button
                          type="button"
                          className="dashboard-primary-button"
                          onClick={() =>
                            recepcionarOrden(
                              orden,
                            )
                          }
                          disabled={
                            procesando
                          }
                        >
                          {procesando ? (
                            <LoaderCircle
                              className="spinner"
                              size={17}
                            />
                          ) : (
                            <PackageCheck
                              size={17}
                            />
                          )}

                          Recepcionar
                        </button>
                      )}

                      {puedeAnular && (
                        <button
                          type="button"
                          className="product-state-button product-state-button-danger"
                          onClick={() =>
                            anularOrden(
                              orden,
                            )
                          }
                          disabled={
                            procesando
                          }
                        >
                          <Ban size={16} />
                          Anular
                        </button>
                      )}
                    </footer>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {mostrarFormulario && (
          <PurchaseOrderForm
            ordenEditar={ordenEditar}
            onCancelar={
              cerrarFormulario
            }
            onOrdenCreada={
              registrarOrdenCreada
            }
            onOrdenActualizada={
              registrarOrdenActualizada
            }
            onLogout={onLogout}
          />
        )}
      </section>
    </AppLayout>
  );
}

export default PurchaseOrdersPage;