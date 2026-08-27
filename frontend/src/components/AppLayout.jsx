import { useState } from "react";
import {
  ArrowLeftRight,
  Bell,
  Building2,
  ClipboardList,
  ContactRound,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  X,
} from "lucide-react";

function AppLayout({
  sesion,
  onLogout,
  activeSection = "inicio",
  onNavigate = () => {},
  children,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const nombreRol =
    sesion.rol?.nombre ||
    sesion.usuario?.rol?.nombre ||
    "";

  const esSuperAdministrador =
    nombreRol === "SuperAdministrador";

  const esAdministrador =
    nombreRol === "Administrador";

  const opcionesMenu = [
    {
      id: "inicio",
      nombre: "Inicio",
      icono: LayoutDashboard,
      visible: true,
    },
    {
      id: "empresas",
      nombre: "Empresas",
      icono: Building2,
      visible: esSuperAdministrador,
    },
    {
      id: "usuarios",
      nombre: "Usuarios",
      icono: Users,
      visible:
        esSuperAdministrador || esAdministrador,
    },
    {
      id: "categorias",
      nombre: "Categorías",
      icono: Tags,
      visible: !esSuperAdministrador,
    },
    {
      id: "productos",
      nombre: "Productos",
      icono: Package,
      visible: !esSuperAdministrador,
    },
    {
      id: "clientes",
      nombre: "Clientes",
      icono: ContactRound,
      visible: !esSuperAdministrador,
    },
    {
      id: "proveedores",
      nombre: "Proveedores",
      icono: Truck,
      visible: !esSuperAdministrador,
    },
    {
      id: "ordenes-compra",
      nombre: "Órdenes de compra",
      icono: ClipboardList,
      visible: esAdministrador,
    },
    {
      id: "cotizaciones",
      nombre: "Cotizaciones",
      icono: FileText,
      visible: !esSuperAdministrador,
    },
    {
      id: "ventas",
      nombre: "Ventas",
      icono: ShoppingCart,
      visible: !esSuperAdministrador,
    },
    {
      id: "movimientos",
      nombre: "Movimientos de inventario",
      icono: ArrowLeftRight,
      visible: !esSuperAdministrador,
    },
  ].filter((opcion) => opcion.visible);

  const navegar = (seccion) => {
    onNavigate(seccion);
    setMenuAbierto(false);
  };

  return (
    <div className="app-shell">
      {menuAbierto && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() =>
            setMenuAbierto(false)
          }
          aria-label="Cerrar menú"
        />
      )}

      <aside
        className={`sidebar ${
          menuAbierto ? "sidebar-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Building2 size={25} />
          </div>

          <div>
            <strong>SGCM</strong>
            <span>
              Gestión Comercial Multiempresa
            </span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={() =>
              setMenuAbierto(false)
            }
            aria-label="Cerrar menú"
          >
            <X size={21} />
          </button>
        </div>

        <nav
          className="sidebar-navigation"
          aria-label="Navegación principal"
        >
          {opcionesMenu.map((opcion) => {
            const Icono = opcion.icono;

            const estaActiva =
              activeSection === opcion.id;

            return (
              <button
                key={opcion.id}
                type="button"
                className={`sidebar-link ${
                  estaActiva
                    ? "sidebar-link-active"
                    : ""
                }`}
                onClick={() =>
                  navegar(opcion.id)
                }
              >
                <Icono size={20} />
                <span>{opcion.nombre}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className="sidebar-logout"
          onClick={onLogout}
        >
          <LogOut size={20} />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() =>
              setMenuAbierto(true)
            }
            aria-label="Abrir menú"
          >
            <Menu size={23} />
          </button>

          <div className="topbar-spacer" />

          <button
            type="button"
            className="notification-button"
            aria-label="Notificaciones"
          >
            <Bell size={20} />
          </button>

          <div className="topbar-user">
            <div className="user-avatar">
              {sesion.usuario?.nombre
                ?.charAt(0)
                ?.toUpperCase() || "U"}
            </div>

            <div className="user-information">
              <strong>
                {sesion.usuario?.nombre}
              </strong>

              <span>
                {sesion.empresa?.nombre} ·{" "}
                {nombreRol}
              </span>
            </div>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;