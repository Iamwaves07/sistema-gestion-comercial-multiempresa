import { useEffect, useState } from "react";
import {
  LoaderCircle,
  PackagePlus,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { apiRequest } from "../services/api";

const datosIniciales = {
  nombre: "",
  precio: "",
  stock: "0",
  stockMinimo: "0",
  categoriaId: "",
};

function ProductForm({
  productoEditar = null,
  onCancelar,
  onProductoCreado,
  onProductoActualizado,
  onLogout,
}) {
  const esEdicion = Boolean(productoEditar);

  const [formulario, setFormulario] =
    useState(datosIniciales);

  const [categorias, setCategorias] = useState([]);
  const [cargandoCategorias, setCargandoCategorias] =
    useState(true);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!productoEditar) {
      setFormulario(datosIniciales);
      return;
    }

    setFormulario({
      nombre: productoEditar.nombre || "",
      precio: String(productoEditar.precio ?? ""),
      stock: String(productoEditar.stock ?? 0),
      stockMinimo: String(
        productoEditar.stockMinimo ?? 0,
      ),
      categoriaId: String(
        productoEditar.categoria?.id ?? "",
      ),
    });
  }, [productoEditar]);

  useEffect(() => {
    const cargarCategorias = async () => {
      setCargandoCategorias(true);
      setError("");

      try {
        const resultado = await apiRequest(
          "/categorias",
        );

        const categoriasActivas = (
          resultado?.data?.categorias || []
        ).filter((categoria) => categoria.estado);

        setCategorias(categoriasActivas);
      } catch (errorSolicitud) {
        if (errorSolicitud.status === 401) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cargar las categorías.",
        );
      } finally {
        setCargandoCategorias(false);
      }
    };

    cargarCategorias();
  }, [onLogout]);

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target;

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }));
  };

  const guardarProducto = async (evento) => {
    evento.preventDefault();

    setGuardando(true);
    setError("");

    try {
      if (esEdicion) {
        const resultado = await apiRequest(
          `/productos/${productoEditar.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              nombre: formulario.nombre.trim(),
              precio: Number(formulario.precio),
              stockMinimo: Number(
                formulario.stockMinimo,
              ),
              categoriaId: Number(
                formulario.categoriaId,
              ),
            }),
          },
        );

        onProductoActualizado(
          resultado.data.producto,
          resultado.message,
        );

        return;
      }

      const resultado = await apiRequest("/productos", {
        method: "POST",
        body: JSON.stringify({
          nombre: formulario.nombre.trim(),
          precio: Number(formulario.precio),
          stock: Number(formulario.stock),
          stockMinimo: Number(
            formulario.stockMinimo,
          ),
          categoriaId: Number(
            formulario.categoriaId,
          ),
        }),
      });

      onProductoCreado(
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
          (esEdicion
            ? "No fue posible actualizar el producto."
            : "No fue posible crear el producto."),
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
        aria-labelledby="product-form-title"
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
                Gestión de inventario
              </p>

              <h2 id="product-form-title">
                {esEdicion
                  ? "Editar producto"
                  : "Registrar producto"}
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
          onSubmit={guardarProducto}
        >
          {error && (
            <div
              className="error-message"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="product-form-grid">
            <label className="product-form-field product-form-field-full">
              <span>Nombre del producto</span>

              <input
                type="text"
                name="nombre"
                value={formulario.nombre}
                onChange={actualizarCampo}
                placeholder="Ejemplo: Teclado mecánico"
                autoComplete="off"
                required
                disabled={guardando}
              />
            </label>

            <label className="product-form-field">
              <span>Precio</span>

              <input
                type="number"
                name="precio"
                value={formulario.precio}
                onChange={actualizarCampo}
                placeholder="0"
                min="1"
                step="1"
                required
                disabled={guardando}
              />
            </label>

            <label className="product-form-field">
              <span>Categoría</span>

              <select
                name="categoriaId"
                value={formulario.categoriaId}
                onChange={actualizarCampo}
                required
                disabled={
                  guardando ||
                  cargandoCategorias ||
                  categorias.length === 0
                }
              >
                <option value="">
                  {cargandoCategorias
                    ? "Cargando categorías..."
                    : "Selecciona una categoría"}
                </option>

                {categorias.map((categoria) => (
                  <option
                    key={categoria.id}
                    value={categoria.id}
                  >
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </label>

            {!esEdicion && (
              <label className="product-form-field">
                <span>Stock inicial</span>

                <input
                  type="number"
                  name="stock"
                  value={formulario.stock}
                  onChange={actualizarCampo}
                  min="0"
                  step="1"
                  required
                  disabled={guardando}
                />

                <small>
                  Después se modificará mediante
                  movimientos.
                </small>
              </label>
            )}

            <label
              className={
                esEdicion
                  ? "product-form-field product-form-field-full"
                  : "product-form-field"
              }
            >
              <span>Stock mínimo</span>

              <input
                type="number"
                name="stockMinimo"
                value={formulario.stockMinimo}
                onChange={actualizarCampo}
                min="0"
                step="1"
                required
                disabled={guardando}
              />

              <small>
                Se utilizará para generar alertas.
              </small>
            </label>
          </div>

          {esEdicion && (
            <div className="product-form-warning">
              El stock actual no se modifica desde este
              formulario. Los cambios de inventario deben
              registrarse mediante entradas, salidas o
              ajustes.
            </div>
          )}

          {!cargandoCategorias &&
            categorias.length === 0 && (
              <div
                className="product-form-warning"
                role="alert"
              >
                No existen categorías activas. Debes
                registrar o reactivar una categoría antes
                de guardar el producto.
              </div>
            )}

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
              disabled={
                guardando ||
                cargandoCategorias ||
                categorias.length === 0
              }
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
                    : "Guardar producto"}
                </>
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default ProductForm;