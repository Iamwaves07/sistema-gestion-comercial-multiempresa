import { useEffect, useState } from "react";
import {
  FolderPlus,
  LoaderCircle,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { apiRequest } from "../services/api";

const datosIniciales = {
  nombre: "",
  descripcion: "",
};

function CategoryForm({
  categoriaEditar = null,
  onCancelar,
  onCategoriaCreada,
  onCategoriaActualizada,
  onLogout,
}) {
  const esEdicion = Boolean(categoriaEditar);

  const [formulario, setFormulario] =
    useState(datosIniciales);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!categoriaEditar) {
      setFormulario(datosIniciales);
      return;
    }

    setFormulario({
      nombre: categoriaEditar.nombre || "",
      descripcion: categoriaEditar.descripcion || "",
    });
  }, [categoriaEditar]);

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target;

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }));
  };

  const guardarCategoria = async (evento) => {
    evento.preventDefault();

    setGuardando(true);
    setError("");

    try {
      const datosCategoria = {
        nombre: formulario.nombre.trim(),
        descripcion:
          formulario.descripcion.trim() || null,
      };

      if (esEdicion) {
        const resultado = await apiRequest(
          `/categorias/${categoriaEditar.id}`,
          {
            method: "PUT",
            body: JSON.stringify(datosCategoria),
          },
        );

        onCategoriaActualizada(
          resultado.data.categoria,
          resultado.message,
        );

        return;
      }

      const resultado = await apiRequest("/categorias", {
        method: "POST",
        body: JSON.stringify(datosCategoria),
      });

      onCategoriaCreada(
        resultado.data.categoria,
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
            ? "No fue posible actualizar la categoría."
            : "No fue posible crear la categoría."),
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
        aria-labelledby="category-form-title"
      >
        <header className="product-form-header">
          <div className="product-form-title">
            <div className="product-form-title-icon">
              {esEdicion ? (
                <Pencil size={24} />
              ) : (
                <FolderPlus size={24} />
              )}
            </div>

            <div>
              <p className="page-eyebrow">
                Organización del catálogo
              </p>

              <h2 id="category-form-title">
                {esEdicion
                  ? "Editar categoría"
                  : "Registrar categoría"}
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
          onSubmit={guardarCategoria}
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
              <span>Nombre de la categoría</span>

              <input
                type="text"
                name="nombre"
                value={formulario.nombre}
                onChange={actualizarCampo}
                placeholder="Ejemplo: Tecnología"
                autoComplete="off"
                required
                disabled={guardando}
              />
            </label>

            <label className="product-form-field product-form-field-full">
              <span>Descripción</span>

              <textarea
                name="descripcion"
                value={formulario.descripcion}
                onChange={actualizarCampo}
                placeholder="Describe brevemente los productos que pertenecen a esta categoría"
                rows="5"
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
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={19} />

                  {esEdicion
                    ? "Guardar cambios"
                    : "Guardar categoría"}
                </>
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default CategoryForm;