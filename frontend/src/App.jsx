import { useCallback, useState } from "react";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ModulePage from "./pages/ModulePage";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import ClientsPage from "./pages/ClientsPage";
import MovementsPage from "./pages/MovementsPage";
import UsersPage from "./pages/UsersPage";
import CompaniesPage from "./pages/CompaniesPage";
import QuotesPage from "./pages/QuotesPage";
import SalesPage from "./pages/SalesPage";
import SuppliersPage from "./pages/SuppliersPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import "./App.css";

function obtenerSesionGuardada() {
  const sesionGuardada =
    localStorage.getItem("sgcm_sesion") ||
    sessionStorage.getItem("sgcm_sesion");

  if (!sesionGuardada) {
    return null;
  }

  try {
    return JSON.parse(sesionGuardada);
  } catch {
    localStorage.removeItem("sgcm_sesion");
    sessionStorage.removeItem("sgcm_sesion");
    return null;
  }
}

/*
 * =========================================================
 * SECCIÓN INICIAL
 * =========================================================
 *
 * Normalmente la aplicación comienza en Inicio.
 *
 * Si el navegador está regresando desde Webpay,
 * el backend nos redirige al frontend utilizando:
 *
 * ?webpay=aprobado
 * ?webpay=rechazado
 * ?webpay=cancelado
 * etc.
 *
 * En ese caso abrimos directamente Ventas para que
 * SalesPage pueda leer el resultado y mostrarlo.
 * =========================================================
 */

function obtenerSeccionInicial() {
  const parametros =
    new URLSearchParams(
      window.location.search,
    );

  if (parametros.has("webpay")) {
    return "ventas";
  }

  return "inicio";
}

const modulos = {
  empresas: {
    title: "Empresas",
    description:
      "Administra las organizaciones registradas en el sistema multiempresa.",
  },

  usuarios: {
    title: "Usuarios",
    description:
      "Gestiona las cuentas de acceso, sus roles y la empresa asociada.",
  },

  categorias: {
    title: "Categorías",
    description:
      "Organiza los productos mediante categorías asociadas a la empresa.",
  },

  productos: {
    title: "Productos",
    description:
      "Consulta y administra el catálogo de productos y sus niveles de inventario.",
  },

  clientes: {
    title: "Clientes",
    description:
      "Gestiona la información comercial de los clientes de la empresa.",
  },

  movimientos: {
    title: "Movimientos",
    description:
      "Registra y consulta entradas, salidas y ajustes de inventario.",
  },
};

function App() {
  const [sesion, setSesion] = useState(
    obtenerSesionGuardada,
  );

  const [seccionActiva, setSeccionActiva] =
    useState(obtenerSeccionInicial);

  const iniciarSesion = (datosSesion) => {
    setSesion(datosSesion);

    /*
     * Si por alguna razón Webpay regresó cuando
     * la sesión había expirado, después del login
     * volvemos igualmente al módulo Ventas.
     */
    setSeccionActiva(
      obtenerSeccionInicial(),
    );
  };

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem("sgcm_sesion");
    sessionStorage.removeItem("sgcm_sesion");

    setSesion(null);
    setSeccionActiva("inicio");
  }, []);

  const navegarA = (seccion) => {
    setSeccionActiva(seccion);
  };

  if (!sesion) {
    return (
      <LoginPage
        onLogin={iniciarSesion}
      />
    );
  }

  if (seccionActiva === "inicio") {
    return (
      <DashboardPage
        sesion={sesion}
        onLogout={cerrarSesion}
        onNavigate={navegarA}
      />
    );
  }

  if (seccionActiva === "productos") {
    return (
      <ProductsPage
        sesion={sesion}
        onLogout={cerrarSesion}
        onNavigate={navegarA}
      />
    );
  }

  if (seccionActiva === "categorias") {
    return (
      <CategoriesPage
        sesion={sesion}
        onLogout={cerrarSesion}
        onNavigate={navegarA}
      />
    );
  }

  if (seccionActiva === "clientes") {
    return (
      <ClientsPage
        sesion={sesion}
        onLogout={cerrarSesion}
        onNavigate={navegarA}
      />
    );
  }

  if (seccionActiva === "proveedores") {
    return (
      <SuppliersPage
        sesion={sesion}
        onLogout={cerrarSesion}
        onNavigate={navegarA}
      />
    );
  }

  if (seccionActiva === "ordenes-compra") {
    return (
      <PurchaseOrdersPage
        sesion={sesion}
        onLogout={cerrarSesion}
        onNavigate={navegarA}
      />
    );
  }

  if (seccionActiva === "cotizaciones") {
    return (
      <QuotesPage
        sesion={sesion}
        onLogout={cerrarSesion}
        onNavigate={navegarA}
      />
    );
  }

  if (seccionActiva === "ventas") {
    return (
      <SalesPage
        sesion={sesion}
        onLogout={cerrarSesion}
        onNavigate={navegarA}
      />
    );
  }

  if (seccionActiva === "movimientos") {
    return (
      <MovementsPage
        sesion={sesion}
        onLogout={cerrarSesion}
        onNavigate={navegarA}
      />
    );
  }

  if (seccionActiva === "usuarios") {
    return (
      <UsersPage
        sesion={sesion}
        onLogout={cerrarSesion}
        onNavigate={navegarA}
      />
    );
  }

  if (seccionActiva === "empresas") {
    return (
      <CompaniesPage
        sesion={sesion}
        onLogout={cerrarSesion}
        onNavigate={navegarA}
      />
    );
  }

  const moduloSeleccionado =
    modulos[seccionActiva];

  if (!moduloSeleccionado) {
    return (
      <DashboardPage
        sesion={sesion}
        onLogout={cerrarSesion}
        onNavigate={navegarA}
      />
    );
  }

  return (
    <ModulePage
      sesion={sesion}
      onLogout={cerrarSesion}
      activeSection={seccionActiva}
      onNavigate={navegarA}
      title={moduloSeleccionado.title}
      description={
        moduloSeleccionado.description
      }
    />
  );
}

export default App;