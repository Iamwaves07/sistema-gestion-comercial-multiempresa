import { useEffect, useMemo, useState } from "react";
import {
  LoaderCircle,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest } from "../services/api";

const crearDetalleVacio = () => ({
  productoId: "",
  cantidad: "1",
  costoUnitarioNeto: "",
});

function PurchaseOrderForm({
  ordenEditar,
  onCancelar,
  onOrdenCreada,
  onOrdenActualizada,
  onLogout,
}) {
  const esEdicion = Boolean(ordenEditar);

  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);

  const [formulario, setFormulario] = useState({
    proveedorId: ordenEditar
      ? String(ordenEditar.proveedorId)
      : "",
    observacion: ordenEditar?.observacion || "",
    detalles:
      ordenEditar?.detalles?.length > 0
        ? ordenEditar.detalles.map((detalle) => ({
            productoId: String(detalle.productoId),
            cantidad: String(detalle.cantidad),
            costoUnitarioNeto: String(
              detalle.costoUnitarioNeto,
            ),
          }))
        : [crearDetalleVacio()],
  });

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
          resultadoProveedores,
          resultadoProductos,
        ] = await Promise.all([
          apiRequest("/proveedores"),
          apiRequest("/productos"),
        ]);

        setProveedores(
          resultadoProveedores?.data?.proveedores || [],
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
            "No fue posible cargar los proveedores y productos.",
        );
      } finally {
        setCargandoOpciones(false);
      }
    };

    cargarOpciones();
  }, [onLogout]);

  const proveedoresDisponibles = useMemo(() => {
    return proveedores.filter(
      (proveedor) => proveedor.estado,
    );
  }, [proveedores]);

  const productosDisponibles = useMemo(() => {
    return productos.filter(
      (producto) =>
        producto.estado &&
        producto.categoria?.estado !== false,
    );
  }, [productos]);

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));

    setError("");
  };

  const actualizarDetalle = (
    indice,
    campo,
    valor,
  ) => {
    setFormulario((actual) => ({
      ...actual,
      detalles: actual.detalles.map(
        (detalle, posicion) =>
          posicion === indice
            ? {
                ...detalle,
                [campo]: valor,
              }
            : detalle,
      ),
    }));

    setError("");
  };

  const agregarDetalle = () => {
    setFormulario((actual) => ({
      ...actual,
      detalles: [
        ...actual.detalles,
        crearDetalleVacio(),
      ],
    }));

    setError("");
  };

  const eliminarDetalle = (indice) => {
    if (formulario.detalles.length === 1) {
      setError(
        "La orden de compra debe contener al menos un producto.",
      );
      return;
    }

    setFormulario((actual) => ({
      ...actual,
      detalles: actual.detalles.filter(
        (_, posicion) => posicion !== indice,
      ),
    }));

    setError("");
  };

  const redondearDinero = (valor) =>
    Math.round(
      (Number(valor) + Number.EPSILON) * 100,
    ) / 100;

  const calcularSubtotalDetalle = (detalle) => {
    const cantidad = Number(detalle.cantidad);
    const costo = Number(
      detalle.costoUnitarioNeto,
    );

    if (
      !Number.isFinite(cantidad) ||
      !Number.isFinite(costo)
    ) {
      return 0;
    }

    return redondearDinero(cantidad * costo);
  };

  const subtotalNeto = useMemo(() => {
    return redondearDinero(
      formulario.detalles.reduce(
        (acumulado, detalle) =>
          acumulado +
          calcularSubtotalDetalle(detalle),
        0,
      ),
    );
  }, [formulario.detalles]);

  const montoIva = useMemo(() => {
    return redondearDinero(
      subtotalNeto * 0.19,
    );
  }, [subtotalNeto]);

  const total = useMemo(() => {
    return redondearDinero(
      subtotalNeto + montoIva,
    );
  }, [subtotalNeto, montoIva]);

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);
  };

  const validarFormulario = () => {
    const proveedorId = Number(
      formulario.proveedorId,
    );

    if (
      !Number.isInteger(proveedorId) ||
      proveedorId <= 0
    ) {
      return "Debes seleccionar un proveedor.";
    }

    if (formulario.detalles.length === 0) {
      return "Debes agregar al menos un producto.";
    }

    const productosSeleccionados = new Set();

    for (const detalle of formulario.detalles) {
      const productoId = Number(
        detalle.productoId,
      );

      const cantidad = Number(
        detalle.cantidad,
      );

      const costoUnitarioNeto = Number(
        detalle.costoUnitarioNeto,
      );

      if (
        !Number.isInteger(productoId) ||
        productoId <= 0
      ) {
        return "Debes seleccionar un producto válido en cada línea.";
      }

      if (productosSeleccionados.has(productoId)) {
        return "Un producto no puede aparecer más de una vez en la orden de compra.";
      }

      productosSeleccionados.add(productoId);

      if (
        !Number.isInteger(cantidad) ||
        cantidad <= 0
      ) {
        return "La cantidad debe ser un número entero mayor que cero.";
      }

      if (
        !Number.isFinite(costoUnitarioNeto) ||
        costoUnitarioNeto <= 0
      ) {
        return "El costo unitario neto debe ser mayor que cero.";
      }
    }

    return "";
  };

  const guardarOrden = async (evento) => {
    evento.preventDefault();

    const mensajeValidacion =
      validarFormulario();

    if (mensajeValidacion) {
      setError(mensajeValidacion);
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const datosOrden = {
        proveedorId: Number(
          formulario.proveedorId,
        ),

        observacion:
          formulario.observacion.trim() ||
          null,

        detalles: formulario.detalles.map(
          (detalle) => ({
            productoId: Number(
              detalle.productoId,
            ),

            cantidad: Number(
              detalle.cantidad,
            ),

            costoUnitarioNeto: Number(
              detalle.costoUnitarioNeto,
            ),
          }),
        ),
      };

      if (esEdicion) {
        const resultado = await apiRequest(
          `/ordenes-compra/${ordenEditar.id}`,
          {
            method: "PUT",
            body: JSON.stringify(datosOrden),
          },
        );

        onOrdenActualizada(
          resultado.data.orden,
          resultado.message,
        );

        return;
      }

      const resultado = await apiRequest(
        "/ordenes-compra",
        {
          method: "POST",
          body: JSON.stringify(datosOrden),
        },
      );

      onOrdenCreada(
        resultado.data.orden,
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
            ? "No fue posible actualizar la orden de compra."
            : "No fue posible crear la orden de compra."),
      );
    } finally {
      setGuardando(false);
    }
  };

  const sinOpciones =
    proveedoresDisponibles.length === 0 ||
    productosDisponibles.length === 0;

  return (
    <div className="modal-backdrop">
      <section
        className="product-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-order-form-title"
      >
        <header className="product-form-header">
          <div className="product-form-title">
            <div className="product-form-title-icon">
              {esEdicion ? (
                <Pencil size={24} />
              ) : (
                <PackagePlus size={24} />
              )}
            </div>

            <div>
              <p className="page-eyebrow">
                Gestión de abastecimiento
              </p>

              <h2 id="purchase-order-form-title">
                {esEdicion
                  ? `Editar ${ordenEditar.numero}`
                  : "Nueva orden de compra"}
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
          onSubmit={guardarOrden}
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
                Cargando proveedores y productos...
              </p>
            </div>
          ) : sinOpciones ? (
            <div className="empty-dashboard-state">
              <PackagePlus size={34} />

              <strong>
                No hay datos disponibles
              </strong>

              <p>
                Debes contar con al menos un
                proveedor activo y un producto activo
                para crear una orden de compra.
              </p>
            </div>
          ) : (
            <>
              <div className="product-form-grid">
                <label className="product-form-field product-form-field-full">
                  <span>Proveedor</span>

                  <select
                    name="proveedorId"
                    value={formulario.proveedorId}
                    onChange={actualizarCampo}
                    required
                    disabled={guardando}
                  >
                    <option value="">
                      Selecciona un proveedor
                    </option>

                    {proveedoresDisponibles.map(
                      (proveedor) => (
                        <option
                          key={proveedor.id}
                          value={proveedor.id}
                        >
                          {proveedor.razonSocial} —{" "}
                          {proveedor.rut}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="product-form-field product-form-field-full">
                  <span>Observación</span>

                  <textarea
                    name="observacion"
                    value={formulario.observacion}
                    onChange={actualizarCampo}
                    rows="3"
                    placeholder="Ejemplo: Reposición de inventario correspondiente al mes"
                    disabled={guardando}
                  />

                  <small>
                    Campo opcional.
                  </small>
                </label>
              </div>

              <div className="purchase-order-products-heading">
                <div>
                  <strong>
                    Productos de la orden
                  </strong>

                  <small>
                    Indica cantidad y costo unitario
                    neto de compra.
                  </small>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={agregarDetalle}
                  disabled={guardando}
                >
                  <Plus size={17} />
                  Agregar producto
                </button>
              </div>

              <div className="purchase-order-details">
                {formulario.detalles.map(
                  (detalle, indice) => (
                    <article
                      className="purchase-order-detail"
                      key={indice}
                    >
                      <div className="product-form-grid">
                        <label className="product-form-field product-form-field-full">
                          <span>
                            Producto {indice + 1}
                          </span>

                          <select
                            value={
                              detalle.productoId
                            }
                            onChange={(evento) =>
                              actualizarDetalle(
                                indice,
                                "productoId",
                                evento.target.value,
                              )
                            }
                            required
                            disabled={guardando}
                          >
                            <option value="">
                              Selecciona un producto
                            </option>

                            {productosDisponibles.map(
                              (producto) => (
                                <option
                                  key={producto.id}
                                  value={producto.id}
                                >
                                  {producto.nombre} —
                                  Stock actual:{" "}
                                  {producto.stock}
                                </option>
                              ),
                            )}
                          </select>
                        </label>

                        <label className="product-form-field">
                          <span>Cantidad</span>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={detalle.cantidad}
                            onChange={(evento) =>
                              actualizarDetalle(
                                indice,
                                "cantidad",
                                evento.target.value,
                              )
                            }
                            required
                            disabled={guardando}
                          />
                        </label>

                        <label className="product-form-field">
                          <span>
                            Costo unitario neto
                          </span>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={
                              detalle.costoUnitarioNeto
                            }
                            onChange={(evento) =>
                              actualizarDetalle(
                                indice,
                                "costoUnitarioNeto",
                                evento.target.value,
                              )
                            }
                            placeholder="Ejemplo: 15000"
                            required
                            disabled={guardando}
                          />
                        </label>
                      </div>

                      <div className="purchase-order-detail-footer">
                        <span>
                          Subtotal neto:{" "}
                          <strong>
                            {formatearMoneda(
                              calcularSubtotalDetalle(
                                detalle,
                              ),
                            )}
                          </strong>
                        </span>

                        <button
                          type="button"
                          className="product-state-button product-state-button-danger"
                          onClick={() =>
                            eliminarDetalle(indice)
                          }
                          disabled={
                            guardando ||
                            formulario.detalles
                              .length === 1
                          }
                        >
                          <Trash2 size={16} />
                          Quitar
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>

              <section className="purchase-order-totals">
                <div>
                  <span>Subtotal neto</span>
                  <strong>
                    {formatearMoneda(
                      subtotalNeto,
                    )}
                  </strong>
                </div>

                <div>
                  <span>IVA 19%</span>
                  <strong>
                    {formatearMoneda(montoIva)}
                  </strong>
                </div>

                <div>
                  <span>Total</span>
                  <strong>
                    {formatearMoneda(total)}
                  </strong>
                </div>

                <small>
                  Los valores mostrados son una
                  vista previa. El cálculo definitivo
                  de Neto, IVA y Total se realiza en
                  el backend.
                </small>
              </section>

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
                        : "Crear orden"}
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

export default PurchaseOrderForm;