import {
  ArrowLeftRight,
  Package,
  TriangleAlert,
  Users,
} from "lucide-react";
import AppLayout from "../components/AppLayout";

function DashboardPage({ sesion, onLogout }) {
  return (
    <AppLayout
      sesion={sesion}
      onLogout={onLogout}
      activeSection="inicio"
    >
      <section className="dashboard-heading">
        <div>
          <p className="page-eyebrow">Resumen comercial</p>
          <h1>Panel principal</h1>
          <p>
            Revisa la información general de{" "}
            <strong>{sesion.empresa?.nombre}</strong>.
          </p>
        </div>

        <button type="button" className="dashboard-primary-button">
          <ArrowLeftRight size={19} />
          Registrar movimiento
        </button>
      </section>

      <section className="dashboard-metrics">
        <article className="metric-card">
          <div className="metric-icon">
            <Package size={23} />
          </div>

          <div>
            <span>Total de productos</span>
            <strong>—</strong>
            <small>Pendiente de consultar al backend</small>
          </div>
        </article>

        <article className="metric-card metric-card-warning">
          <div className="metric-icon">
            <TriangleAlert size={23} />
          </div>

          <div>
            <span>Productos con stock bajo</span>
            <strong>—</strong>
            <small>Pendiente de consultar al backend</small>
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-icon">
            <Users size={23} />
          </div>

          <div>
            <span>Total de clientes</span>
            <strong>—</strong>
            <small>Pendiente de consultar al backend</small>
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-icon">
            <ArrowLeftRight size={23} />
          </div>

          <div>
            <span>Movimientos registrados</span>
            <strong>—</strong>
            <small>Pendiente de consultar al backend</small>
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div>
              <h2>Últimos movimientos de inventario</h2>
              <p>
                Entradas, salidas y ajustes registrados recientemente.
              </p>
            </div>
          </div>

          <div className="empty-dashboard-state">
            <ArrowLeftRight size={34} />

            <strong>Datos pendientes de cargar</strong>

            <p>
              En el siguiente bloque conectaremos esta sección con el endpoint
              de movimientos del backend.
            </p>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div>
              <h2>Productos con stock bajo</h2>
              <p>
                Productos cuyo stock es menor o igual al mínimo definido.
              </p>
            </div>
          </div>

          <div className="empty-dashboard-state">
            <TriangleAlert size={34} />

            <strong>Sin información cargada</strong>

            <p>
              Esta sección mostrará automáticamente las alertas de inventario.
            </p>
          </div>
        </article>
      </section>
    </AppLayout>
  );
}

export default DashboardPage;