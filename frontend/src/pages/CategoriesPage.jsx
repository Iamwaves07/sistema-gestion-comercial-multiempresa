import { useEffect, useMemo, useState } from "react";
import {
  FolderTree,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  TriangleAlert,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import CategoryForm from "../components/CategoryForm";
import ConfirmDialog from "../components/ConfirmDialog";
import { apiRequest } from "../services/api";

function CategoriesPage({
  sesion,
  onLogout,
  onNavigate,
}) {
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [categoriaEditar, setCategoriaEditar] =
    useState(null);

  const [categoriaEstado, setCategoriaEstado] =
    useState(null);

  const [procesandoEstado, setProcesandoEstado] =
    useState(false);

  const nombreRol =
    sesion.rol?.nombre ||
    sesion.usuario?.rol?.nombre ||
    "";

  const puedeAdministrarCategorias =
    nombreRol === "Administrador";

  useEffect(() => {
    const cargarCategorias = async () => {
      setCargando(true);
      setError("");

      try {
        const resultado = await apiRequest(
          "/categorias",
        );

        setCategorias(
          resultado?.data?.categorias || [],
        );
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
        setCargando(false);
      }
    };

    cargarCategorias();
  }, [onLogout]);

  const categoriasFiltradas = useMemo(() => {
    const textoBusqueda = busqueda
      .trim()
      .toLowerCase();

    if (!textoBusqueda) {
      return categorias;
    }

    return categorias.filter((categoria) => {
      const nombre =
        categoria.nombre?.toLowerCase() || "";

      const descripcion =
        categoria.descripcion?.toLowerCase() || "";

      return (
        nombre.includes(textoBusqueda) ||
        descripcion.includes(textoBusqueda)
      );
    });
  }, [busqueda, categorias]);

  const ordenarCategorias = (listaCategorias) => {
    return [...listaCategorias].sort(
      (categoriaA, categoriaB) =>
        categoriaA.nombre.localeCompare(
          categoriaB.nombre,
          "es",
        ),
    );
  };

  const abrirFormularioCreacion = () => {
    setError("");
    setMensajeExito("");
    setCategoriaEditar(null);
    setMostrarFormulario(true);
  };

  const abrirFormularioEdicion = (categoria) => {
    setError("");
    setMensajeExito("");
    setCategoriaEditar(categoria);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setCategoriaEditar(null);
  };

  const manejarCategoriaCreada = (
    categoriaCreada,
    mensaje,
  ) => {
    setCategorias((categoriasActuales) =>
      ordenarCategorias([
        ...categoriasActuales,
        categoriaCreada,
      ]),
    );

    setMensajeExito(
      mensaje || "Categoría creada correctamente.",
    );

    cerrarFormulario();
  };

  const manejarCategoriaActualizada = (
    categoriaActualizada,
    mensaje,
  ) => {
    setCategorias((categoriasActuales) =>
      ordenarCategorias(
        categoriasActuales.map((categoria) =>
          categoria.id === categoriaActualizada.id
            ? categoriaActualizada
            : categoria,
        ),
      ),
    );

    setMensajeExito(
      mensaje ||
        "Categoría actualizada correctamente.",
    );

    cerrarFormulario();
  };

  const abrirConfirmacionEstado = (categoria) => {
    setError("");
    setMensajeExito("");
    setCategoriaEstado(categoria);
  };

  const cerrarConfirmacionEstado = () => {
    setCategoriaEstado(null);
  };

  const confirmarCambioEstado = async () => {
    if (!categoriaEstado) {
      return;
    }

    setProcesandoEstado(true);
    setError("");

    try {
      const estaActiva = categoriaEstado.estado;

      const ruta = estaActiva
        ? `/categorias/${categoriaEstado.id}`
        : `/categorias/${categoriaEstado.id}/reactivar`;

      const resultado = await apiRequest(ruta, {
        method: estaActiva ? "DELETE" : "PATCH",
      });

      const categoriaActualizada =
        resultado.data.categoria;

      setCategorias((categoriasActuales) =>
        categoriasActuales.map((categoria) =>
          categoria.id === categoriaActualizada.id
            ? categoriaActualizada
            : categoria,
        ),
      );

      setMensajeExito(
        resultado.message ||
          (estaActiva
            ? "Categoría desactivada correctamente."
            : "Categoría reactivada correctamente."),
      );

      cerrarConfirmacionEstado();
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible cambiar el estado de la categoría.",
      );

      cerrarConfirmacionEstado();
    } finally {
      setProcesandoEstado(false);
    }
  };

  return (
    <AppLayout
      sesion={sesion}
      onLogout={onLogout}
      activeSection="categorias"
      onNavigate={onNavigate}
    >
      <section className="page-heading products-heading">
        <div>
          <p className="page-eyebrow">
            Organización del catálogo
          </p>

          <h1>Categorías</h1>

          <p>
            Organiza los productos mediante categorías
            asociadas a la empresa.
          </p>
        </div>

        {puedeAdministrarCategorias && (
          <button
            type="button"
            className="dashboard-primary-button"
            onClick={abrirFormularioCreacion}
          >
            <Plus size={19} />
            Registrar categoría
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
              <FolderTree size={22} />
            </div>

            <div>
              <span>Categorías registradas</span>
              <strong>{categorias.length}</strong>
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
              placeholder="Buscar por nombre o descripción"
              aria-label="Buscar categorías"
            />
          </label>
        </div>

        {cargando ? (
          <div className="products-loading">
            <LoaderCircle
              className="spinner"
              size={36}
            />

            <p>Cargando categorías...</p>
          </div>
        ) : categoriasFiltradas.length === 0 ? (
          <div className="empty-dashboard-state">
            <TriangleAlert size={34} />

            <strong>
              {categorias.length === 0
                ? "No hay categorías registradas"
                : "No se encontraron resultados"}
            </strong>

            <p>
              {categorias.length === 0
                ? "Las categorías creadas aparecerán en esta sección."
                : "Prueba utilizando otro nombre o descripción."}
            </p>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table categories-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Estado</th>

                  {puedeAdministrarCategorias && (
                    <th>Acciones</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {categoriasFiltradas.map(
                  (categoria) => (
                    <tr key={categoria.id}>
                      <td>
                        <div className="product-name-cell">
                          <div className="product-table-icon">
                            <FolderTree size={18} />
                          </div>

                          <strong>
                            {categoria.nombre}
                          </strong>
                        </div>
                      </td>

                      <td>
                        {categoria.descripcion ||
                          "Sin descripción"}
                      </td>

                      <td>
                        <span
                          className={
                            categoria.estado
                              ? "product-status product-status-active"
                              : "product-status product-status-inactive"
                          }
                        >
                          {categoria.estado
                            ? "Activa"
                            : "Inactiva"}
                        </span>
                      </td>

                      {puedeAdministrarCategorias && (
                        <td>
                          <div className="product-actions">
                            <button
                              type="button"
                              className="product-edit-button"
                              onClick={() =>
                                abrirFormularioEdicion(
                                  categoria,
                                )
                              }
                              aria-label={`Editar ${categoria.nombre}`}
                            >
                              <Pencil size={17} />
                              Editar
                            </button>

                            <button
                              type="button"
                              className={
                                categoria.estado
                                  ? "product-state-button product-state-button-danger"
                                  : "product-state-button product-state-button-success"
                              }
                              onClick={() =>
                                abrirConfirmacionEstado(
                                  categoria,
                                )
                              }
                              aria-label={
                                categoria.estado
                                  ? `Desactivar ${categoria.nombre}`
                                  : `Reactivar ${categoria.nombre}`
                              }
                            >
                              {categoria.estado ? (
                                <>
                                  <PowerOff size={17} />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Power size={17} />
                                  Reactivar
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarFormulario && (
        <CategoryForm
          categoriaEditar={categoriaEditar}
          onCancelar={cerrarFormulario}
          onCategoriaCreada={
            manejarCategoriaCreada
          }
          onCategoriaActualizada={
            manejarCategoriaActualizada
          }
          onLogout={onLogout}
        />
      )}

      {categoriaEstado && (
        <ConfirmDialog
          elemento={categoriaEstado}
          tipo="categoría"
          procesando={procesandoEstado}
          onCancelar={cerrarConfirmacionEstado}
          onConfirmar={confirmarCambioEstado}
        />
      )}
    </AppLayout>
  );
}

export default CategoriesPage;