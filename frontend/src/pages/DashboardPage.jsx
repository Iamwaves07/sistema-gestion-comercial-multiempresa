import { LogOut, ShieldCheck } from "lucide-react";

function DashboardPage({ sesion, onLogout }) {
  return (
    <main className="success-page">
      <section className="success-card">
        <div className="success-icon">
          <ShieldCheck size={40} />
        </div>

        <p className="eyebrow">Autenticación completada</p>

        <h1>Bienvenida, {sesion.usuario?.nombre}</h1>

        <div className="session-details">
          <div>
            <span>Empresa</span>
            <strong>{sesion.empresa?.nombre}</strong>
          </div>

          <div>
            <span>Rol</span>
            <strong>{sesion.rol?.nombre}</strong>
          </div>

          <div>
            <span>Correo</span>
            <strong>{sesion.usuario?.correo}</strong>
          </div>
        </div>

        <p className="success-description">
          El frontend se conectó correctamente con la autenticación JWT del
          backend.
        </p>

        <button
          type="button"
          className="secondary-button"
          onClick={onLogout}
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}

export default DashboardPage;