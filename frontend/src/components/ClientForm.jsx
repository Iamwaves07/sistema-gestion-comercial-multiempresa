import { useEffect, useState } from "react";
import {
  LoaderCircle,
  Pencil,
  Save,
  UserPlus,
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

function ClientForm({
  clienteEditar = null,
  onCancelar,
  onClienteCreado,
  onClienteActualizado,
  onLogout,
}) {
  const esEdicion = Boolean(clienteEditar);

  const [formulario, setFormulario] =
    useState(datosIniciales);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clienteEditar) {
      setFormulario(datosIniciales);
      return;
    }

    setFormulario({
      nombre: clienteEditar.nombre || "",
      rut: clienteEditar.rut || "",
      correo: clienteEditar.correo || "",
      telefono: clienteEditar.telefono || "",
      direccion: clienteEditar.direccion || "",
    });
  }, [clienteEditar]);

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target;

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }));
  };

  const normalizarRut = (rut) => {
    return String(rut)
      .trim()
      .replace(/\./g, "")
      .replace(/\s/g, "")
      .toUpperCase();
  };

  const guardarCliente = async (evento) => {
    evento.preventDefault();

    setGuardando(true);
    setError("");

    try {
      const datosCliente = {
        nombre: formulario.nombre.trim(),
        rut: normalizarRut(formulario.rut),
        correo:
          formulario.correo.trim().toLowerCase() ||
          null,
        telefono:
          formulario.telefono.trim() || null,
        direccion:
          formulario.direccion.trim() || null,
      };

      if (esEdicion) {
        const resultado = await apiRequest(
          `/clientes/${clienteEditar.id}`,
          {
            method: "PUT",
            body: JSON.stringify(datosCliente),
          },
        );

        onClienteActualizado(
          resultado.data.cliente,
          resultado.message,
        );

        return;
      }

      const resultado = await apiRequest("/clientes", {
        method: "POST",
        body: JSON.stringify(datosCliente),
      });

      onClienteCreado(
        resultado.data.cliente,
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
            ? "No fue posible actualizar el cliente."
            : "No fue posible registrar el cliente."),
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
        aria-labelledby="client-form-title"
      >
        <header className="product-form-header">
          <div className="product-form-title">
            <div className="product-form-title-icon">
              {esEdicion ? (
                <Pencil size={24} />
              ) : (
                <UserPlus size={24} />
              )}
            </div>

            <div>
              <p className="page-eyebrow">
                Gestión comercial
              </p>

              <h2 id="client-form-title">
                {esEdicion
                  ? "Editar cliente"
                  : "Registrar cliente"}
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
          onSubmit={guardarCliente}
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
              <span>Nombre del cliente</span>

              <input
                type="text"
                name="nombre"
                value={formulario.nombre}
                onChange={actualizarCampo}
                placeholder="Ejemplo: María González"
                autoComplete="name"
                required
                disabled={guardando}
              />
            </label>

            <label className="product-form-field">
              <span>RUT</span>

              <input
                type="text"
                name="rut"
                value={formulario.rut}
                onChange={actualizarCampo}
                placeholder="Ejemplo: 12345678-9"
                autoComplete="off"
                required
                disabled={guardando}
              />

              <small>
                Puede escribirse con o sin puntos.
              </small>
            </label>

            <label className="product-form-field">
              <span>Correo electrónico</span>

              <input
                type="email"
                name="correo"
                value={formulario.correo}
                onChange={actualizarCampo}
                placeholder="cliente@correo.cl"
                autoComplete="email"
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

              <textarea
                name="direccion"
                value={formulario.direccion}
                onChange={actualizarCampo}
                placeholder="Ejemplo: Avenida Principal 123, Santiago"
                rows="3"
                autoComplete="street-address"
                disabled={guardando}
              />

              <small>
                Correo, teléfono y dirección son opcionales.
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
                    : "Guardar cliente"}
                </>
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default ClientForm;