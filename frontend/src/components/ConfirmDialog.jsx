import {
  LoaderCircle,
  Power,
  PowerOff,
  X,
} from "lucide-react";

function ConfirmDialog({
  producto = null,
  elemento = null,
  tipo = "producto",
  procesando,
  onCancelar,
  onConfirmar,
}) {
  const registro = elemento || producto;
  const estaActivo = Boolean(registro?.estado);
  const esCategoria = tipo === "categoría";

  const nombreEntidad = esCategoria
    ? "categoría"
    : "producto";

  const gestionEntidad = esCategoria
    ? "Gestión de categorías"
    : "Gestión de productos";

  const mensajeDesactivacion = esCategoria
    ? "La categoría dejará de estar disponible para clasificar nuevos productos, pero su información se conservará."
    : "El producto dejará de estar disponible para nuevas operaciones, pero su información y movimientos históricos se conservarán.";

  const mensajeReactivacion = esCategoria
    ? "La categoría volverá a estar disponible para organizar los productos de la empresa."
    : "El producto volverá a estar disponible para las operaciones de la empresa.";

  return (
    <div className="modal-backdrop">
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <header className="confirm-dialog-header">
          <div
            className={
              estaActivo
                ? "confirm-dialog-icon confirm-dialog-icon-danger"
                : "confirm-dialog-icon confirm-dialog-icon-success"
            }
          >
            {estaActivo ? (
              <PowerOff size={25} />
            ) : (
              <Power size={25} />
            )}
          </div>

          <button
            type="button"
            className="product-form-close"
            onClick={onCancelar}
            disabled={procesando}
            aria-label="Cerrar confirmación"
          >
            <X size={21} />
          </button>
        </header>

        <div className="confirm-dialog-content">
          <p className="page-eyebrow">
            {gestionEntidad}
          </p>

          <h2 id="confirm-dialog-title">
            {estaActivo
              ? `¿Desactivar ${nombreEntidad}?`
              : `¿Reactivar ${nombreEntidad}?`}
          </h2>

          <p>
            {estaActivo
              ? mensajeDesactivacion
              : mensajeReactivacion}
          </p>

          <div className="confirm-product-name">
            {registro?.nombre}
          </div>
        </div>

        <footer className="confirm-dialog-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancelar}
            disabled={procesando}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={
              estaActivo
                ? "confirm-action-button confirm-action-danger"
                : "confirm-action-button confirm-action-success"
            }
            onClick={onConfirmar}
            disabled={procesando}
          >
            {procesando ? (
              <>
                <LoaderCircle
                  className="spinner"
                  size={19}
                />
                Procesando...
              </>
            ) : estaActivo ? (
              <>
                <PowerOff size={19} />
                Desactivar
              </>
            ) : (
              <>
                <Power size={19} />
                Reactivar
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default ConfirmDialog;