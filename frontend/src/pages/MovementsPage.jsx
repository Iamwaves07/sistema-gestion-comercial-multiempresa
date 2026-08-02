import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  History,
  LoaderCircle,
  Plus,
  Search,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import MovementForm from "../components/MovementForm";
import { apiRequest } from "../services/api";

function MovementsPage({
  sesion,
  onLogout,
  onNavigate,
}) {
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] =
    useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const nombreRol =
    sesion.rol?.nombre ||
    sesion.usuario?.rol?.nombre ||
    "";

  const puedeRegistrarMovimientos =
    nombreRol === "Administrador" ||
    nombreRol === "Vendedor";

  const cargarMovimientos = useCallback(async () => {
    const resultado = await apiRequest("/movimientos");

    setMovimientos(
      resultado?.data?.movimientos || [],
    );
  }, []);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [
        resultadoMovimientos,
        resultadoProductos,
      ] = await Promise.all([
        apiRequest("/movimientos"),
        apiRequest("/productos"),
      ]);

      setMovimientos(
        resultadoMovimientos?.data?.movimientos || [],
      );

      setProductos(
        resultadoProductos?.data?.productos || [],
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible cargar los movimientos de inventario.",
      );
    } finally {
      setCargando(false);
    }
  }, [onLogout]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const movimientosFiltrados = useMemo(() => {
    const textoBusqueda = busqueda
      .trim()
      .toLowerCase();

    if (!textoBusqueda) {
      return movimientos;
    }

    return movimientos.filter((movimiento) => {
      const camposBusqueda = [
        movimiento.tipo,
        movimiento.producto?.nombre,
        movimiento.usuario?.nombre,
        movimiento.usuario?.correo,
        movimiento.observacion,
        movimiento.cantidad,
      ];

      return camposBusqueda.some((campo) =>
        String(campo || "")
          .toLowerCase()
          .includes(textoBusqueda),
      );
    });
  }, [busqueda, movimientos]);

  const abrirFormulario = () => {
    setError("");
    setMensajeExito("");
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
  };

  const manejarMovimientoCreado = async (
    movimientoCreado,
    productoActualizado,
    mensaje,
  ) => {
    setProductos((productosActuales) =>
      productosActuales.map((producto) =>
        producto.id === productoActualizado.id
          ? {
              ...producto,
              stock: productoActualizado.stock,
            }
          : producto,
      ),
    );

    setMensajeExito(
      mensaje ||
        "Movimiento de inventario registrado correctamente.",
    );

    cerrarFormulario();

    try {
      await cargarMovimientos();
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        "El movimiento se registró, pero no fue posible actualizar el historial.",
      );
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) {
      return "Sin fecha";
    }

    const fechaMovimiento = new Date(fecha);

    if (Number.isNaN(fechaMovimiento.getTime())) {
      return "Fecha no disponible";
    }

    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(fechaMovimiento);
  };

  const obtenerConfiguracionTipo = (tipo) => {
    if (tipo === "ENTRADA") {
      return {
        texto: "Entrada",
        clase:
          "movement-type movement-type-entry",
        icono: <ArrowDownToLine size={17} />,
      };
    }

    if (tipo === "SALIDA") {
      return {
        texto: "Salida",
        clase:
          "movement-type movement-type-exit",
        icono: <ArrowUpFromLine size={17} />,
      };
    }

    return {
      texto: "Ajuste",
      clase:
        "movement-type movement-type-adjustment",
      icono: <SlidersHorizontal size={17} />,
    };
  };

  return (
    <AppLayout
      sesion={sesion}
      onLogout={onLogout}
      activeSection="movimientos"
      onNavigate={onNavigate}
    >
      <section className="page-heading products-heading">
        <div>
          <p className="page-eyebrow">
            Control de inventario
          </p>

          <h1>Movimientos</h1>

          <p>
            Consulta el historial de entradas, salidas
            y ajustes realizados sobre el stock.
          </p>
        </div>

        {puedeRegistrarMovimientos && (
          <button
            type="button"
            className="dashboard-primary-button"
            onClick={abrirFormulario}
          >
            <Plus size={19} />
            Registrar movimiento
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
              <History size={22} />
            </div>

            <div>
              <span>Movimientos registrados</span>
              <strong>{movimientos.length}</strong>
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
              placeholder="Buscar por producto, tipo o usuario"
              aria-label="Buscar movimientos"
            />
          </label>
        </div>

        {cargando ? (
          <div className="products-loading">
            <LoaderCircle
              className="spinner"
              size={36}
            />

            <p>Cargando movimientos...</p>
          </div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className="empty-dashboard-state">
            <TriangleAlert size={34} />

            <strong>
              {movimientos.length === 0
                ? "No hay movimientos registrados"
                : "No se encontraron resultados"}
            </strong>

            <p>
              {movimientos.length === 0
                ? "Las entradas, salidas y ajustes aparecerán en esta sección."
                : "Prueba utilizando otro producto, tipo o usuario."}
            </p>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table movements-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Responsable</th>
                  <th>Observación</th>
                  <th>Fecha</th>
                </tr>
              </thead>

              <tbody>
                {movimientosFiltrados.map(
                  (movimiento) => {
                    const configuracionTipo =
                      obtenerConfiguracionTipo(
                        movimiento.tipo,
                      );

                    return (
                      <tr key={movimiento.id}>
                        <td>
                          <span
                            className={
                              configuracionTipo.clase
                            }
                          >
                            {
                              configuracionTipo.icono
                            }

                            {
                              configuracionTipo.texto
                            }
                          </span>
                        </td>

                        <td>
                          <div className="product-name-cell">
                            <div className="product-table-icon">
                              <Boxes size={18} />
                            </div>

                            <div>
                              <strong>
                                {movimiento.producto
                                  ?.nombre ||
                                  "Producto no disponible"}
                              </strong>

                              <small className="client-secondary-text">
                                Stock actual:{" "}
                                {movimiento.producto
                                  ?.stock ?? "—"}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong className="movement-quantity">
                            {movimiento.tipo ===
                            "AJUSTE"
                              ? movimiento.cantidad
                              : movimiento.tipo ===
                                  "ENTRADA"
                                ? `+${movimiento.cantidad}`
                                : `-${movimiento.cantidad}`}
                          </strong>
                        </td>

                        <td>
                          <div className="movement-user">
                            <strong>
                              {movimiento.usuario
                                ?.nombre ||
                                "Usuario no disponible"}
                            </strong>

                            <small>
                              {movimiento.usuario
                                ?.correo || ""}
                            </small>
                          </div>
                        </td>

                        <td>
                          <span className="movement-observation">
                            {movimiento.observacion ||
                              "Sin observación"}
                          </span>
                        </td>

                        <td>
                          <span className="movement-date">
                            {formatearFecha(
                              movimiento.fechaCreacion,
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarFormulario && (
        <MovementForm
          productos={productos}
          onCancelar={cerrarFormulario}
          onMovimientoCreado={
            manejarMovimientoCreado
          }
          onLogout={onLogout}
        />
      )}
    </AppLayout>
  );
}

export default MovementsPage;