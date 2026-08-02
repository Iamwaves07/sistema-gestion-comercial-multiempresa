import { useEffect, useMemo, useState } from "react";
import {
  LoaderCircle,
  Package,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import ProductForm from "../components/ProductForm";
import { apiRequest } from "../services/api";

function ProductsPage({
  sesion,
  onLogout,
  onNavigate,
}) {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const nombreRol =
    sesion.rol?.nombre ||
    sesion.usuario?.rol?.nombre ||
    "";

  const puedeAdministrarProductos =
    nombreRol === "Administrador";

  useEffect(() => {
    const cargarProductos = async () => {
      setCargando(true);
      setError("");

      try {
        const resultado = await apiRequest("/productos");

        setProductos(
          resultado?.data?.productos || [],
        );
      } catch (errorSolicitud) {
        if (errorSolicitud.status === 401) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cargar los productos.",
        );
      } finally {
        setCargando(false);
      }
    };

    cargarProductos();
  }, [onLogout]);

  const productosFiltrados = useMemo(() => {
    const textoBusqueda = busqueda
      .trim()
      .toLowerCase();

    if (!textoBusqueda) {
      return productos;
    }

    return productos.filter((producto) => {
      const nombre =
        producto.nombre?.toLowerCase() || "";

      const categoria =
        producto.categoria?.nombre?.toLowerCase() || "";

      return (
        nombre.includes(textoBusqueda) ||
        categoria.includes(textoBusqueda)
      );
    });
  }, [busqueda, productos]);

  const obtenerEstadoStock = (producto) => {
    const stockActual = Number(producto.stock);
    const stockMinimo = Number(producto.stockMinimo);

    if (stockActual <= stockMinimo) {
      return {
        texto: "Stock bajo",
        clase: "stock-status-low",
      };
    }

    return {
      texto: "Disponible",
      clase: "stock-status-ok",
    };
  };

  const formatearPrecio = (precio) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(precio));
  };

  const abrirFormulario = () => {
    setError("");
    setMensajeExito("");
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
  };

  const manejarProductoCreado = (
    productoCreado,
    mensaje,
  ) => {
    setProductos((productosActuales) =>
      [...productosActuales, productoCreado].sort(
        (productoA, productoB) =>
          productoA.nombre.localeCompare(
            productoB.nombre,
            "es",
          ),
      ),
    );

    setMensajeExito(
      mensaje || "Producto creado correctamente.",
    );

    setMostrarFormulario(false);
  };

  return (
    <AppLayout
      sesion={sesion}
      onLogout={onLogout}
      activeSection="productos"
      onNavigate={onNavigate}
    >
      <section className="page-heading products-heading">
        <div>
          <p className="page-eyebrow">
            Gestión de inventario
          </p>

          <h1>Productos</h1>

          <p>
            Consulta los productos registrados y revisa
            sus niveles actuales de inventario.
          </p>
        </div>

        {puedeAdministrarProductos && (
          <button
            type="button"
            className="dashboard-primary-button"
            onClick={abrirFormulario}
          >
            <Plus size={19} />
            Registrar producto
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
              <Package size={22} />
            </div>

            <div>
              <span>Productos registrados</span>
              <strong>{productos.length}</strong>
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
              placeholder="Buscar por nombre o categoría"
              aria-label="Buscar productos"
            />
          </label>
        </div>

        {cargando ? (
          <div className="products-loading">
            <LoaderCircle
              className="spinner"
              size={36}
            />

            <p>Cargando productos...</p>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="empty-dashboard-state">
            <TriangleAlert size={34} />

            <strong>
              {productos.length === 0
                ? "No hay productos registrados"
                : "No se encontraron resultados"}
            </strong>

            <p>
              {productos.length === 0
                ? "Los productos creados aparecerán en esta sección."
                : "Prueba utilizando otro nombre o categoría."}
            </p>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table products-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock actual</th>
                  <th>Stock mínimo</th>
                  <th>Estado de stock</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {productosFiltrados.map((producto) => {
                  const estadoStock =
                    obtenerEstadoStock(producto);

                  return (
                    <tr key={producto.id}>
                      <td>
                        <div className="product-name-cell">
                          <div className="product-table-icon">
                            <Package size={18} />
                          </div>

                          <strong>
                            {producto.nombre}
                          </strong>
                        </div>
                      </td>

                      <td>
                        {producto.categoria?.nombre ||
                          "Sin categoría"}
                      </td>

                      <td>
                        {formatearPrecio(
                          producto.precio,
                        )}
                      </td>

                      <td>{producto.stock}</td>

                      <td>{producto.stockMinimo}</td>

                      <td>
                        <span
                          className={`stock-status ${estadoStock.clase}`}
                        >
                          {estadoStock.texto}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            producto.estado
                              ? "product-status product-status-active"
                              : "product-status product-status-inactive"
                          }
                        >
                          {producto.estado
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarFormulario && (
        <ProductForm
          onCancelar={cerrarFormulario}
          onProductoCreado={
            manejarProductoCreado
          }
          onLogout={onLogout}
        />
      )}
    </AppLayout>
  );
}

export default ProductsPage;