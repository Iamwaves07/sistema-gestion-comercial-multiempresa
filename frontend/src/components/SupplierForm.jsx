import { useEffect, useState } from "react";
import {
  Building2,
  LoaderCircle,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { apiRequest } from "../services/api";

const datosIniciales = {
  razonSocial: "",
  rut: "",
  giro: "",
  correo: "",
  telefono: "",
  direccion: "",
};

function SupplierForm({
  proveedorEditar = null,
  onCancelar,
  onProveedorCreado,
  onProveedorActualizado,
  onLogout,
}) {
  const esEdicion = Boolean(proveedorEditar);

  const [formulario, setFormulario] =
    useState(datosIniciales);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (proveedorEditar) {
      setFormulario({
        razonSocial:
          proveedorEditar.razonSocial || "",
        rut: proveedorEditar.rut || "",
        giro: proveedorEditar.giro || "",
        correo: proveedorEditar.correo || "",
        telefono:
          proveedorEditar.telefono || "",
        direccion:
          proveedorEditar.direccion || "",
      });

      return;
    }

    setFormulario(datosIniciales);
  }, [proveedorEditar]);

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target;

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }));

    setError("");
  };

  const guardarProveedor = async (evento) => {
    evento.preventDefault();

    setGuardando(true);
    setError("");

    try {
      const datosProveedor = {
        razonSocial:
          formulario.razonSocial.trim(),
        rut: formulario.rut.trim(),
        giro:
          formulario.giro.trim() || null,
        correo:
          formulario.correo
            .trim()
            .toLowerCase() || null,
        telefono:
          formulario.telefono.trim() || null,
        direccion:
          formulario.direccion.trim() || null,
      };

      if (!datosProveedor.razonSocial) {
        setError(
          "La razón social es obligatoria.",
        );
        return;
      }

      if (!datosProveedor.rut) {
        setError(
          "El RUT del proveedor es obligatorio.",
        );
        return;
      }

      if (esEdicion) {
        const resultado = await apiRequest(
          `/proveedores/${proveedorEditar.id}`,
          {
            method: "PUT",
            body: JSON.stringify(
              datosProveedor,
            ),
          },
        );

        onProveedorActualizado(
          resultado.data.proveedor,
          resultado.message,
        );

        return;
      }

      const resultado = await apiRequest(
        "/proveedores",
        {
          method: "POST",
          body: JSON.stringify(
            datosProveedor,
          ),
        },
      );

      onProveedorCreado(
        resultado.data.proveedor,
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
            ? "No fue posible actualizar el proveedor."
            : "No fue posible registrar el proveedor."),
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
        aria-labelledby="supplier-form-title"
      >
        <header className="product-form-header">
          <div className="product-form-title">
            <div className="product-form-title-icon">
              {esEdicion ? (
                <Pencil size={24} />
              ) : (
                <Building2 size={24} />
              )}
            </div>

            <div>
              <p className="page-eyebrow">
                Gestión de compras
              </p>

              <h2 id="supplier-form-title">
                {esEdicion
                  ? "Editar proveedor"
                  : "Registrar proveedor"}
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
          onSubmit={guardarProveedor}
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
            <label className="product-form-field">
              <span>Razón social</span>

              <input
                type="text"
                name="razonSocial"
                value={formulario.razonSocial}
                onChange={actualizarCampo}
                placeholder="Ejemplo: Distribuidora Andes SpA"
                required
                disabled={guardando}
              />

              <small>
                Nombre legal o comercial del
                proveedor.
              </small>
            </label>

            <label className="product-form-field">
              <span>RUT</span>

              <input
                type="text"
                name="rut"
                value={formulario.rut}
                onChange={actualizarCampo}
                placeholder="76.123.456-7"
                required
                disabled={guardando}
              />

              <small>
                El sistema normalizará el RUT antes
                de almacenarlo.
              </small>
            </label>

            <label className="product-form-field product-form-field-full">
              <span>Giro</span>

              <input
                type="text"
                name="giro"
                value={formulario.giro}
                onChange={actualizarCampo}
                placeholder="Ejemplo: Venta mayorista de artículos de computación"
                disabled={guardando}
              />
            </label>

            <label className="product-form-field">
              <span>Correo electrónico</span>

              <input
                type="email"
                name="correo"
                value={formulario.correo}
                onChange={actualizarCampo}
                placeholder="ventas@proveedor.cl"
                autoComplete="email"
                disabled={guardando}
              />
            </label>

            <label className="product-form-field">
              <span>Teléfono</span>

              <input
                type="text"
                name="telefono"
                value={formulario.telefono}
                onChange={actualizarCampo}
                placeholder="+56 9 1234 5678"
                autoComplete="tel"
                disabled={guardando}
              />
            </label>

            <label className="product-form-field product-form-field-full">
              <span>Dirección</span>

              <input
                type="text"
                name="direccion"
                value={formulario.direccion}
                onChange={actualizarCampo}
                placeholder="Ejemplo: Av. Providencia 1234, Santiago"
                autoComplete="street-address"
                disabled={guardando}
              />
            </label>
          </div>

          <div className="product-form-actions">
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
                    size={18}
                  />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />

                  {esEdicion
                    ? "Guardar cambios"
                    : "Registrar proveedor"}
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default SupplierForm;