import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  LoaderCircle,
  Save,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { apiRequest } from "../services/api";

const datosIniciales = {
  productoId: "",
  tipo: "ENTRADA",
  cantidad: "",
  observacion: "",
};

function MovementForm({
  productos,
  onCancelar,
  onMovimientoCreado,
  onLogout,
}) {
  const [formulario, setFormulario] =
    useState(datosIniciales);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const productosDisponibles = useMemo(() => {
    return productos.filter(
      (producto) =>
        producto.estado &&
        producto.categoria?.estado !== false,
    );
  }, [productos]);

  const productoSeleccionado = useMemo(() => {
    return productosDisponibles.find(
      (producto) =>
        producto.id ===
        Number(formulario.productoId),
    );
  }, [
    formulario.productoId,
    productosDisponibles,
  ]);

  useEffect(() => {
    if (
      productosDisponibles.length > 0 &&
      !formulario.productoId
    ) {
      setFormulario((formularioActual) => ({
        ...formularioActual,
        productoId: String(
          productosDisponibles[0].id,
        ),
      }));
    }
  }, [
    formulario.productoId,
    productosDisponibles,
  ]);

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target;

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }));

    setError("");
  };

  const obtenerIconoTipo = () => {
    if (formulario.tipo === "ENTRADA") {
      return <ArrowDownToLine size={24} />;
    }

    if (formulario.tipo === "SALIDA") {
      return <ArrowUpFromLine size={24} />;
    }

    return <SlidersHorizontal size={24} />;
  };

  const guardarMovimiento = async (evento) => {
    evento.preventDefault();

    setGuardando(true);
    setError("");

    try {
      const cantidadNumero = Number(
        formulario.cantidad,
      );

      if (
        !Number.isInteger(cantidadNumero) ||
        (formulario.tipo === "AJUSTE"
          ? cantidadNumero < 0
          : cantidadNumero <= 0)
      ) {
        setError(
          formulario.tipo === "AJUSTE"
            ? "El stock ajustado debe ser un número entero igual o mayor que cero."
            : "La cantidad debe ser un número entero mayor que cero.",
        );

        return;
      }

      const resultado = await apiRequest(
        "/movimientos",
        {
          method: "POST",
          body: JSON.stringify({
            productoId: Number(
              formulario.productoId,
            ),
            tipo: formulario.tipo,
            cantidad: cantidadNumero,
            observacion:
              formulario.observacion.trim() ||
              null,
          }),
        },
      );

      onMovimientoCreado(
        resultado.data.movimiento,
        resultado.data.producto,
        resultado.message,
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible registrar el movimiento de inventario.",
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
        aria-labelledby="movement-form-title"
      >
        <header className="product-form-header">
          <div className="product-form-title">
            <div className="product-form-title-icon">
              {obtenerIconoTipo()}
            </div>

            <div>
              <p className="page-eyebrow">
                Control de inventario
              </p>

              <h2 id="movement-form-title">
                Registrar movimiento
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
          onSubmit={guardarMovimiento}
        >
          {error && (
            <div
              className="error-message"
              role="alert"
            >
              {error}
            </div>
          )}

          {productosDisponibles.length === 0 ? (
            <div className="empty-dashboard-state">
              <Boxes size={34} />

              <strong>
                No hay productos disponibles
              </strong>

              <p>
                Debes tener al menos un producto
                activo asociado a una categoría
                activa.
              </p>
            </div>
          ) : (
            <>
              <div className="product-form-grid">
                <label className="product-form-field product-form-field-full">
                  <span>Producto</span>

                  <select
                    name="productoId"
                    value={formulario.productoId}
                    onChange={actualizarCampo}
                    required
                    disabled={guardando}
                  >
                    {productosDisponibles.map(
                      (producto) => (
                        <option
                          key={producto.id}
                          value={producto.id}
                        >
                          {producto.nombre} — Stock:{" "}
                          {producto.stock}
                        </option>
                      ),
                    )}
                  </select>

                  {productoSeleccionado && (
                    <small>
                      Stock actual:{" "}
                      <strong>
                        {productoSeleccionado.stock}
                      </strong>
                    </small>
                  )}
                </label>

                <label className="product-form-field">
                  <span>Tipo de movimiento</span>

                  <select
                    name="tipo"
                    value={formulario.tipo}
                    onChange={actualizarCampo}
                    disabled={guardando}
                  >
                    <option value="ENTRADA">
                      Entrada
                    </option>

                    <option value="SALIDA">
                      Salida
                    </option>

                    <option value="AJUSTE">
                      Ajuste
                    </option>
                  </select>
                </label>

                <label className="product-form-field">
                  <span>
                    {formulario.tipo === "AJUSTE"
                      ? "Nuevo stock"
                      : "Cantidad"}
                  </span>

                  <input
                    type="number"
                    name="cantidad"
                    value={formulario.cantidad}
                    onChange={actualizarCampo}
                    min={
                      formulario.tipo === "AJUSTE"
                        ? "0"
                        : "1"
                    }
                    step="1"
                    placeholder={
                      formulario.tipo === "AJUSTE"
                        ? "Ejemplo: 15"
                        : "Ejemplo: 5"
                    }
                    required
                    disabled={guardando}
                  />

                  <small>
                    {formulario.tipo === "ENTRADA" &&
                      "La cantidad se sumará al stock actual."}

                    {formulario.tipo === "SALIDA" &&
                      "La cantidad se descontará del stock actual."}

                    {formulario.tipo === "AJUSTE" &&
                      "La cantidad indicada reemplazará el stock actual."}
                  </small>
                </label>

                <label className="product-form-field product-form-field-full">
                  <span>Observación</span>

                  <textarea
                    name="observacion"
                    value={formulario.observacion}
                    onChange={actualizarCampo}
                    placeholder="Ejemplo: Recepción de mercadería del proveedor"
                    rows="4"
                    disabled={guardando}
                  />

                  <small>
                    Este campo es opcional.
                  </small>
                </label>
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
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Save size={19} />
                      Registrar movimiento
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

export default MovementForm;