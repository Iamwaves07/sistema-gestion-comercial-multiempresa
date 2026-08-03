import { useState } from "react";
import {
  Building2,
  LoaderCircle,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { apiRequest } from "../services/api";

const datosIniciales = {
  nombre: "",
  rut: "",
  correo: "",
  telefono: "",
  direccion: "",
};

function CompanyForm({
  empresaEditar = null,
  onCancelar,
  onEmpresaCreada,
  onEmpresaActualizada,
  onLogout,
}) {
  const esEdicion = Boolean(empresaEditar);

  const [formulario, setFormulario] = useState(() => {
    if (!empresaEditar) {
      return datosIniciales;
    }

    return {
      nombre: empresaEditar.nombre || "",
      rut: empresaEditar.rut || "",
      correo: empresaEditar.correo || "",
      telefono: empresaEditar.telefono || "",
      direccion: empresaEditar.direccion || "",
    };
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target;

    const valorNormalizado =
      name === "rut"
        ? value
            .replace(/\./g, "")
            .replace(/\s/g, "")
            .toUpperCase()
        : value;

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: valorNormalizado,
    }));

    setError("");
  };

  const guardarEmpresa = async (evento) => {
    evento.preventDefault();

    setGuardando(true);
    setError("");

    const datosEmpresa = {
      nombre: formulario.nombre.trim(),
      rut: formulario.rut
        .trim()
        .replace(/\./g, "")
        .replace(/\s/g, "")
        .toUpperCase(),
      correo: formulario.correo
        .trim()
        .toLowerCase(),
      telefono: formulario.telefono.trim(),
      direccion: formulario.direccion.trim(),
    };

    try {
      if (esEdicion) {
        const resultado = await apiRequest(
          `/empresas/${empresaEditar.id}`,
          {
            method: "PUT",
            body: JSON.stringify(datosEmpresa),
          },
        );

        onEmpresaActualizada(
          resultado.data.empresa,
          resultado.message,
        );

        return;
      }

      const resultado = await apiRequest("/empresas", {
        method: "POST",
        body: JSON.stringify(datosEmpresa),
      });

      onEmpresaCreada(
        resultado.data.empresa,
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
            ? "No fue posible actualizar la empresa."
            : "No fue posible registrar la empresa."),
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
        aria-labelledby="company-form-title"
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
                Administración multiempresa
              </p>

              <h2 id="company-form-title">
                {esEdicion
                  ? "Editar empresa"
                  : "Registrar empresa"}
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
          onSubmit={guardarEmpresa}
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
              <span>Nombre de la empresa</span>

              <input
                type="text"
                name="nombre"
                value={formulario.nombre}
                onChange={actualizarCampo}
                placeholder="Ejemplo: Comercial del Sur SpA"
                autoComplete="organization"
                required
                disabled={guardando}
              />
            </label>

            <label className="product-form-field">
              <span>RUT de la empresa</span>

              <input
                type="text"
                name="rut"
                value={formulario.rut}
                onChange={actualizarCampo}
                placeholder="12345678-9"
                pattern="[0-9]{7,8}-[0-9K]"
                title="Ingresa el RUT sin puntos y con guion. Ejemplo: 12345678-9"
                required
                disabled={guardando}
              />

              <small>
                Ingresa el RUT sin puntos y con guion.
              </small>
            </label>

            <label className="product-form-field">
              <span>Correo electrónico</span>

              <input
                type="email"
                name="correo"
                value={formulario.correo}
                onChange={actualizarCampo}
                placeholder="contacto@empresa.cl"
                autoComplete="email"
                required
                disabled={guardando}
              />
            </label>

            <label className="product-form-field">
              <span>Teléfono</span>

              <input
                type="tel"
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
                placeholder="Ejemplo: Avenida Central 123, Santiago"
                autoComplete="street-address"
                disabled={guardando}
              />
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
                    : "Guardar empresa"}
                </>
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default CompanyForm;