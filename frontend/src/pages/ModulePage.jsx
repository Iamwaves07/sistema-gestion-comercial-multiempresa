import { Construction } from "lucide-react";
import AppLayout from "../components/AppLayout";

function ModulePage({
  sesion,
  onLogout,
  activeSection,
  onNavigate,
  title,
  description,
}) {
  return (
    <AppLayout
      sesion={sesion}
      onLogout={onLogout}
      activeSection={activeSection}
      onNavigate={onNavigate}
    >
      <section className="page-heading">
        <div>
          <p className="eyebrow">Módulo del sistema</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>

      <section className="module-placeholder-card">
        <div className="module-placeholder-icon">
          <Construction size={34} />
        </div>

        <div>
          <h2>Módulo en desarrollo</h2>

          <p>
            La navegación hacia esta sección ya se encuentra
            habilitada. En los siguientes pasos desarrollaremos
            sus tablas, formularios y operaciones conectadas con
            el backend.
          </p>
        </div>
      </section>
    </AppLayout>
  );
}

export default ModulePage;