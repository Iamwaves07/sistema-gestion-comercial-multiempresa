import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  LoaderCircle,
  Package,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { apiRequest } from "../services/api";

function DashboardPage({
  sesion,
  onLogout,
  onNavigate,
}) {
  const [resumen, setResumen] = useState({
    totalProductos: 0,
    productosStockBajo: 0,
    totalClientes: 0,
    movimientosMes: 0,
  });
  const [resumenGlobal, setResumenGlobal] = useState({
    totalEmpresas: 0,
    empresasActivas: 0,
    totalUsuarios: 0,
    usuariosActivos: 0,
  });
  const [ultimosMovimientos, setUltimosMovimientos] =
    useState([]);

  const [
    productosConStockBajo,
    setProductosConStockBajo,
  ] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const nombreRol =
    sesion.rol?.nombre ||
    sesion.usuario?.rol?.nombre ||
    "";

  const esSuperAdministrador =
    nombreRol === "SuperAdministrador";

  useEffect(() => {
    const cargarResumen = async () => {
      setCargando(true);
      setError("");

      /*
       * El SuperAdministrador utiliza una vista global distinta.
       * Sus indicadores se conectarán posteriormente con empresas
       * y usuarios.
       */
      if (esSuperAdministrador) {
        try {
          const [
            resultadoEmpresas,
            resultadoUsuarios,
          ] = await Promise.all([
            apiRequest("/empresas"),
            apiRequest("/usuarios"),
          ]);

          const empresas =
            resultadoEmpresas?.data?.empresas || [];

          const usuarios =
            resultadoUsuarios?.data?.usuarios || [];

          setResumenGlobal({
            totalEmpresas: empresas.length,
            empresasActivas: empresas.filter(
              (empresa) => empresa.estado,
            ).length,
            totalUsuarios: usuarios.length,
            usuariosActivos: usuarios.filter(
              (usuario) => usuario.estado,
            ).length,
          });
        } catch (errorSolicitud) {
          if (errorSolicitud.status === 401) {
            onLogout();
            return;
          }

          setError(
            errorSolicitud.message ||
              "No fue posible cargar el resumen global del sistema.",
          );
        } finally {
          setCargando(false);
        }

        return;
      }

      try {
        const [
          resultadoProductos,
          resultadoClientes,
          resultadoMovimientos,
        ] = await Promise.all([
          apiRequest("/productos"),
          apiRequest("/clientes"),
          apiRequest("/movimientos"),
        ]);

        const productos =
          resultadoProductos?.data?.productos || [];

        const clientes =
          resultadoClientes?.data?.clientes || [];

        const movimientos =
          resultadoMovimientos?.data?.movimientos || [];

        const productosStockBajo = productos.filter(
          (producto) =>
            producto.estado &&
            Number(producto.stock) <=
              Number(producto.stockMinimo),
        );

        const fechaActual = new Date();

        const movimientosMes = movimientos.filter(
          (movimiento) => {
            const fechaMovimiento = new Date(
              movimiento.fechaCreacion,
            );

            return (
              fechaMovimiento.getMonth() ===
                fechaActual.getMonth() &&
              fechaMovimiento.getFullYear() ===
                fechaActual.getFullYear()
            );
          },
        );

        setUltimosMovimientos(movimientos.slice(0, 5));

        setProductosConStockBajo(
          productosStockBajo,
        );

        setResumen({
          totalProductos: productos.length,
          productosStockBajo:
            productosStockBajo.length,
          totalClientes: clientes.length,
          movimientosMes: movimientosMes.length,
        });
      } catch (errorSolicitud) {
        if (errorSolicitud.status === 401) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cargar el resumen del panel.",
        );
      } finally {
        setCargando(false);
      }
    };

    cargarResumen();
  }, [esSuperAdministrador, onLogout]);

  const mostrarValor = (valor) => {
    if (cargando) {
      return (
        <LoaderCircle
          className="spinner"
          size={25}
        />
      );
    }

    return valor;
  };

  return (
    <AppLayout
      sesion={sesion}
      onLogout={onLogout}
      activeSection="inicio"
      onNavigate={onNavigate}
    >
      <section className="dashboard-heading">
        <div>
<p className="page-eyebrow">
  {esSuperAdministrador
    ? "Resumen global"
    : "Resumen comercial"}
</p>

<h1>Panel principal</h1>

<p>
  {esSuperAdministrador ? (
    "Revisa la información general del sistema multiempresa."
  ) : (
    <>
      Revisa la información general de{" "}
      <strong>
        {sesion.empresa?.nombre}
      </strong>
      .
    </>
  )}
</p>
        </div>

        {!esSuperAdministrador && (
          <button
            type="button"
            className="dashboard-primary-button"
            onClick={() =>
              onNavigate("movimientos")
            }
          >
            <ArrowLeftRight size={19} />
            Registrar movimiento
          </button>
        )}
      </section>

      {error && (
        <div
          className="error-message"
          role="alert"
        >
          {error}
        </div>
      )}

      {esSuperAdministrador ? (
        <section className="dashboard-metrics">
          <article className="metric-card">
            <div className="metric-icon">
              <Building2 size={23} />
            </div>

            <div>
              <span>Total de empresas</span>

              <strong>
                {mostrarValor(
                  resumenGlobal.totalEmpresas,
                )}
              </strong>

              <small>
                Organizaciones registradas
              </small>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-icon">
              <ShieldCheck size={23} />
            </div>

            <div>
              <span>Empresas activas</span>

              <strong>
                {mostrarValor(
                  resumenGlobal.empresasActivas,
                )}
              </strong>

              <small>
                Empresas habilitadas en el sistema
              </small>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-icon">
              <Users size={23} />
            </div>

            <div>
              <span>Total de usuarios</span>

              <strong>
                {mostrarValor(
                  resumenGlobal.totalUsuarios,
                )}
              </strong>

              <small>
                Cuentas registradas globalmente
              </small>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-icon">
              <ShieldCheck size={23} />
            </div>

            <div>
              <span>Usuarios activos</span>

              <strong>
                {mostrarValor(
                  resumenGlobal.usuariosActivos,
                )}
              </strong>

              <small>
                Usuarios habilitados para acceder
              </small>
            </div>
          </article>
        </section>
      ) : (
        <>
          <section className="dashboard-metrics">
            <article className="metric-card">
              <div className="metric-icon">
                <Package size={23} />
              </div>

              <div>
                <span>Total de productos</span>

                <strong>
                  {mostrarValor(
                    resumen.totalProductos,
                  )}
                </strong>

                <small>
                  Productos registrados en tu empresa
                </small>
              </div>
            </article>

            <article className="metric-card metric-card-warning">
              <div className="metric-icon">
                <TriangleAlert size={23} />
              </div>

              <div>
               <span>
  Productos con stock bajo
</span>

<strong>
  {mostrarValor(
    resumen.productosStockBajo,
  )}
</strong>

<small>
  Stock menor o igual al mínimo
</small>
</div>
</article>

<article className="metric-card">
  <div className="metric-icon">
    <Users size={23} />
  </div>

  <div>
    <span>Total de clientes</span>

    <strong>
      {mostrarValor(
        resumen.totalClientes,
      )}
    </strong>

    <small>
      Clientes registrados en tu empresa
    </small>
  </div>
</article>

<article className="metric-card">
  <div className="metric-icon">
    <ArrowLeftRight size={23} />
  </div>

  <div>
    <span>Movimientos del mes</span>

    <strong>
      {mostrarValor(
        resumen.movimientosMes,
      )}
    </strong>

    <small>
      Entradas, salidas y ajustes
    </small>
  </div>
</article>
</section>

<section className="dashboard-grid">
  <article className="dashboard-card">
    <div className="dashboard-card-heading">
      <div>
        <h2>
          Últimos movimientos de inventario
        </h2>

        <p>
          Entradas, salidas y ajustes
          registrados recientemente.
        </p>
      </div>
    </div>

    {ultimosMovimientos.length === 0 ? (
      <div className="empty-dashboard-state">
        <ArrowLeftRight size={34} />

        <strong>
          No hay movimientos registrados
        </strong>

        <p>
          Cuando se registren entradas,
          salidas o ajustes, aparecerán en
          esta sección.
        </p>
      </div>
    ) : (
      <div className="dashboard-table-wrapper">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>
                Usuario responsable
              </th>
            </tr>
          </thead>

          <tbody>
            {ultimosMovimientos.map(
              (movimiento) => (
                <tr key={movimiento.id}>
                  <td>
                    {new Date(
                      movimiento.fechaCreacion,
                    ).toLocaleString(
                      "es-CL",
                      {
                        dateStyle: "short",
                        timeStyle: "short",
                      },
                    )}
                  </td>

                  <td>
                    {movimiento.producto
                      ?.nombre ||
                      "Producto no disponible"}
                  </td>

                  <td>
                    <span
                      className={`movement-badge movement-${movimiento.tipo.toLowerCase()}`}
                    >
                      {movimiento.tipo}
                    </span>
                  </td>

                  <td>
                    {movimiento.cantidad}
                  </td>

                  <td>
                    {movimiento.usuario
                      ?.nombre ||
                      "Usuario no disponible"}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    )}
  </article>

  <article className="dashboard-card">
    <div className="dashboard-card-heading">
      <div>
        <h2>
          Productos con stock bajo
        </h2>

        <p>
          Productos cuyo stock es menor o
          igual al mínimo definido.
        </p>
      </div>
    </div>

    {productosConStockBajo.length === 0 ? (
      <div className="empty-dashboard-state">
        <TriangleAlert size={34} />

        <strong>
          No hay productos con stock bajo
        </strong>

        <p>
          Todos los productos se encuentran
          sobre el stock mínimo definido.
        </p>
      </div>
    ) : (
      <div className="low-stock-list">
        {productosConStockBajo.map(
          (producto) => (
            <article
              key={producto.id}
              className="low-stock-item"
            >
              <div className="low-stock-item-content">
                <strong className="low-stock-item-name">
                  {producto.nombre}
                </strong>

                <div className="low-stock-item-meta">
                  <span>
                    Stock actual:
                    <strong>
                      {producto.stock}
                    </strong>
                  </span>

                  <span>
                    Stock mínimo:
                    <strong>
                      {producto.stockMinimo}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="low-stock-item-alert">
                <TriangleAlert size={21} />
              </div>
            </article>
          ),
        )}
      </div>
    )}
  </article>
</section>
</>
)}
</AppLayout>
);
}

export default DashboardPage;