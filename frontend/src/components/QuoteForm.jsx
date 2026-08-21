import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  LoaderCircle,
  Minus,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest } from "../services/api";

const detalleInicial = {
  productoId: "",
  cantidad: 1,
};

function QuoteForm({
  cotizacionEditar = null,
  onCancelar,
  onCotizacionCreada,
  onCotizacionActualizada,
  onLogout,
}) {
  const esEdicion = Boolean(cotizacionEditar);

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);

  const [clienteId, setClienteId] = useState("");
  const [fechaVencimiento, setFechaVencimiento] =
    useState("");
  const [observacion, setObservacion] = useState("");

  const [detalles, setDetalles] = useState([
    { ...detalleInicial },
  ]);

  const [cargandoOpciones, setCargandoOpciones] =
    useState(true);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarOpciones = async () => {
      setCargandoOpciones(true);
      setError("");

      try {
        const [
          resultadoClientes,
          resultadoProductos,
        ] = await Promise.all([
          apiRequest("/clientes"),
          apiRequest("/productos"),
        ]);

        const clientesDisponibles =
          resultadoClientes?.data?.clientes?.filter(
            (cliente) => cliente.estado,
          ) || [];

        const productosDisponibles =
          resultadoProductos?.data?.productos?.filter(
            (producto) =>
              producto.estado &&
              producto.categoria?.estado !== false,
          ) || [];

        setClientes(clientesDisponibles);
        setProductos(productosDisponibles);

        if (cotizacionEditar) {
          setClienteId(
            String(
              cotizacionEditar.cliente?.id || "",
            ),
          );

          setObservacion(
            cotizacionEditar.observacion || "",
          );

          if (
            cotizacionEditar.fechaVencimiento
          ) {
            const fecha = new Date(
              cotizacionEditar.fechaVencimiento,
            );

            setFechaVencimiento(
              fecha.toISOString().slice(0, 10),
            );
          }

          setDetalles(
            cotizacionEditar.detalles?.length
              ? cotizacionEditar.detalles.map(
                  (detalle) => ({
                    productoId: String(
                      detalle.producto?.id || "",
                    ),
                    cantidad:
                      Number(detalle.cantidad) || 1,
                  }),
                )
              : [{ ...detalleInicial }],
          );

          return;
        }

        if (clientesDisponibles.length > 0) {
          setClienteId(
            String(clientesDisponibles[0].id),
          );
        }

        if (productosDisponibles.length > 0) {
          setDetalles([
            {
              productoId: String(
                productosDisponibles[0].id,
              ),
              cantidad: 1,
            },
          ]);
        }
      } catch (errorSolicitud) {
        if (errorSolicitud.status === 401) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cargar clientes y productos.",
        );
      } finally {
        setCargandoOpciones(false);
      }
    };

    cargarOpciones();
  }, [cotizacionEditar, onLogout]);

  const productosPorId = useMemo(() => {
    return new Map(
      productos.map((producto) => [
        producto.id,
        producto,
      ]),
    );
  }, [productos]);

  const totalCotizacion = useMemo(() => {
    return detalles.reduce(
      (total, detalle) => {
        const producto = productosPorId.get(
          Number(detalle.productoId),
        );

        if (!producto) {
          return total;
        }

        return (
          total +
          Number(producto.precio) *
            Number(detalle.cantidad || 0)
        );
      },
      0,
    );
  }, [detalles, productosPorId]);

  const formatearPrecio = (valor) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);
  };

  const actualizarDetalle = (
    indice,
    campo,
    valor,
  ) => {
    setDetalles((detallesActuales) =>
      detallesActuales.map(
        (detalle, indiceActual) =>
          indiceActual === indice
            ? {
                ...detalle,
                [campo]: valor,
              }
            : detalle,
      ),
    );

    setError("");
  };

  const agregarProducto = () => {
    const productoDisponible = productos.find(
      (producto) =>
        !detalles.some(
          (detalle) =>
            Number(detalle.productoId) ===
            producto.id,
        ),
    );

    setDetalles((detallesActuales) => [
      ...detallesActuales,
      {
        productoId: productoDisponible
          ? String(productoDisponible.id)
          : "",
        cantidad: 1,
      },
    ]);

    setError("");
  };

  const eliminarProducto = (indice) => {
    if (detalles.length === 1) {
      return;
    }

    setDetalles((detallesActuales) =>
      detallesActuales.filter(
        (_, indiceActual) =>
          indiceActual !== indice,
      ),
    );

    setError("");
  };

  const disminuirCantidad = (indice) => {
    const cantidadActual = Number(
      detalles[indice].cantidad,
    );

    if (cantidadActual <= 1) {
      return;
    }

    actualizarDetalle(
      indice,
      "cantidad",
      cantidadActual - 1,
    );
  };

  const aumentarCantidad = (indice) => {
    const cantidadActual = Number(
      detalles[indice].cantidad,
    );

    actualizarDetalle(
      indice,
      "cantidad",
      cantidadActual + 1,
    );
  };

  const guardarCotizacion = async (evento) => {
    evento.preventDefault();

    setError("");

    if (!clienteId) {
      setError(
        "Debes seleccionar un cliente.",
      );
      return;
    }

    if (detalles.length === 0) {
      setError(
        "La cotización debe contener al menos un producto.",
      );
      return;
    }

    const productosSeleccionados =
      detalles.map((detalle) =>
        Number(detalle.productoId),
      );

    if (
      productosSeleccionados.some(
        (productoId) =>
          !Number.isInteger(productoId) ||
          productoId <= 0,
      )
    ) {
      setError(
        "Todos los productos seleccionados deben ser válidos.",
      );
      return;
    }

    if (
      new Set(productosSeleccionados).size !==
      productosSeleccionados.length
    ) {
      setError(
        "Un producto no puede aparecer más de una vez en la misma cotización.",
      );
      return;
    }

    const cantidadesValidas = detalles.every(
      (detalle) => {
        const cantidad = Number(
          detalle.cantidad,
        );

        return (
          Number.isInteger(cantidad) &&
          cantidad > 0
        );
      },
    );

    if (!cantidadesValidas) {
      setError(
        "Todas las cantidades deben ser números enteros mayores que cero.",
      );
      return;
    }

    setGuardando(true);

    try {
      const datosCotizacion = {
        clienteId: Number(clienteId),

        observacion:
          observacion.trim() || null,

        fechaVencimiento:
          fechaVencimiento || null,

        detalles: detalles.map((detalle) => ({
          productoId: Number(
            detalle.productoId,
          ),
          cantidad: Number(
            detalle.cantidad,
          ),
        })),
      };

      if (esEdicion) {
        const resultado = await apiRequest(
          `/cotizaciones/${cotizacionEditar.id}`,
          {
            method: "PUT",
            body: JSON.stringify(
              datosCotizacion,
            ),
          },
        );

        onCotizacionActualizada(
          resultado.data.cotizacion,
          resultado.message,
        );

        return;
      }

      const resultado = await apiRequest(
        "/cotizaciones",
        {
          method: "POST",
          body: JSON.stringify(
            datosCotizacion,
          ),
        },
      );

      onCotizacionCreada(
        resultado.data.cotizacion,
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
            ? "No fue posible actualizar la cotización."
            : "No fue posible crear la cotización."),
      );
    } finally {
      setGuardando(false);
    }
  };

  const sinClientes = clientes.length === 0;
  const sinProductos = productos.length === 0;

  return (
    <div className="modal-backdrop">
      <section
        className="product-form-modal quote-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-form-title"
      >
        <header className="product-form-header">
          <div className="product-form-title">
            <div className="product-form-title-icon">
              <FileText size={24} />
            </div>

            <div>
              <p className="page-eyebrow">
                Gestión comercial
              </p>

              <h2 id="quote-form-title">
                {esEdicion
                  ? "Editar cotización"
                  : "Nueva cotización"}
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
          onSubmit={guardarCotizacion}
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

              <p>
                Cargando clientes y productos...
              </p>
            </div>
          ) : sinClientes || sinProductos ? (
            <div className="empty-dashboard-state">
              <FileText size={34} />

              <strong>
                No es posible crear una cotización
              </strong>

              <p>
                Debes tener al menos un cliente y
                un producto activos.
              </p>
            </div>
          ) : (
            <>
              <div className="product-form-grid">
                <label className="product-form-field">
                  <span>Cliente</span>

                  <select
                    value={clienteId}
                    onChange={(evento) => {
                      setClienteId(
                        evento.target.value,
                      );
                      setError("");
                    }}
                    required
                    disabled={guardando}
                  >
                    <option value="">
                      Selecciona un cliente
                    </option>

                    {clientes.map((cliente) => (
                      <option
                        key={cliente.id}
                        value={cliente.id}
                      >
                        {cliente.nombre} —{" "}
                        {cliente.rut}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="product-form-field">
                  <span>
                    Fecha de vencimiento
                  </span>

                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(evento) => {
                      setFechaVencimiento(
                        evento.target.value,
                      );
                      setError("");
                    }}
                    disabled={guardando}
                  />

                  <small>
                    Este campo es opcional.
                  </small>
                </label>

                <div className="product-form-field product-form-field-full">
                  <span>Productos cotizados</span>

                  <div className="quote-items">
                    {detalles.map(
                      (detalle, indice) => {
                        const producto =
                          productosPorId.get(
                            Number(
                              detalle.productoId,
                            ),
                          );

                        const subtotal =
                          Number(
                            producto?.precio || 0,
                          ) *
                          Number(
                            detalle.cantidad || 0,
                          );

                        return (
                          <div
                            className="quote-item"
                            key={indice}
                          >
                            <div className="quote-item-product">
                              <select
                                value={
                                  detalle.productoId
                                }
                                onChange={(
                                  evento,
                                ) =>
                                  actualizarDetalle(
                                    indice,
                                    "productoId",
                                    evento.target
                                      .value,
                                  )
                                }
                                required
                                disabled={
                                  guardando
                                }
                              >
                                <option value="">
                                  Selecciona un
                                  producto
                                </option>

                                {productos.map(
                                  (productoOpcion) => (
                                    <option
                                      key={
                                        productoOpcion.id
                                      }
                                      value={
                                        productoOpcion.id
                                      }
                                    >
                                      {
                                        productoOpcion.nombre
                                      }{" "}
                                      —{" "}
                                      {formatearPrecio(
                                        productoOpcion.precio,
                                      )}
                                    </option>
                                  ),
                                )}
                              </select>

                              {producto && (
                                <small>
                                  Precio unitario:{" "}
                                  <strong>
                                    {formatearPrecio(
                                      producto.precio,
                                    )}
                                  </strong>
                                </small>
                              )}
                            </div>

                            <div className="quote-item-quantity">
                              <button
                                type="button"
                                onClick={() =>
                                  disminuirCantidad(
                                    indice,
                                  )
                                }
                                disabled={
                                  guardando ||
                                  Number(
                                    detalle.cantidad,
                                  ) <= 1
                                }
                                aria-label="Disminuir cantidad"
                              >
                                <Minus size={16} />
                              </button>

                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={
                                  detalle.cantidad
                                }
                                onChange={(
                                  evento,
                                ) =>
                                  actualizarDetalle(
                                    indice,
                                    "cantidad",
                                    evento.target
                                      .value,
                                  )
                                }
                                required
                                disabled={
                                  guardando
                                }
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  aumentarCantidad(
                                    indice,
                                  )
                                }
                                disabled={
                                  guardando
                                }
                                aria-label="Aumentar cantidad"
                              >
                                <Plus size={16} />
                              </button>
                            </div>

                            <strong className="quote-item-subtotal">
                              {formatearPrecio(
                                subtotal,
                              )}
                            </strong>

                            <button
                              type="button"
                              className="quote-item-remove"
                              onClick={() =>
                                eliminarProducto(
                                  indice,
                                )
                              }
                              disabled={
                                guardando ||
                                detalles.length === 1
                              }
                              aria-label="Eliminar producto"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        );
                      },
                    )}
                  </div>

                  <button
                    type="button"
                    className="secondary-button quote-add-product"
                    onClick={agregarProducto}
                    disabled={
                      guardando ||
                      detalles.length >=
                        productos.length
                    }
                  >
                    <Plus size={18} />
                    Agregar producto
                  </button>
                </div>

                <label className="product-form-field product-form-field-full">
                  <span>Observación</span>

                  <textarea
                    value={observacion}
                    onChange={(evento) => {
                      setObservacion(
                        evento.target.value,
                      );
                      setError("");
                    }}
                    placeholder="Ejemplo: Valores válidos durante 15 días"
                    rows="3"
                    disabled={guardando}
                  />

                  <small>
                    Este campo es opcional.
                  </small>
                </label>

                <div className="quote-total product-form-field-full">
                  <span>Total cotización</span>

                  <strong>
                    {formatearPrecio(
                      totalCotizacion,
                    )}
                  </strong>

                  <small>
                    El valor definitivo será
                    validado y calculado por el
                    servidor al guardar.
                  </small>
                </div>
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
                        : "Crear cotización"}
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

export default QuoteForm;