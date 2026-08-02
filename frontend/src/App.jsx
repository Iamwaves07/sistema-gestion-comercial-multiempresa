import { useCallback, useState } from "react";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ModulePage from "./pages/ModulePage";
import "./App.css";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import ClientsPage from "./pages/ClientsPage";
import MovementsPage from "./pages/MovementsPage";

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
  const [sesion, setSesion] = useState(obtenerSesionGuardada);
  const [seccionActiva, setSeccionActiva] = useState("inicio");

  const iniciarSesion = (datosSesion) => {
    setSesion(datosSesion);
    setSeccionActiva("inicio");
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
    return <LoginPage onLogin={iniciarSesion} />;
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
if (seccionActiva === "movimientos") {
  return (
    <MovementsPage
      sesion={sesion}
      onLogout={cerrarSesion}
      onNavigate={navegarA}
    />
  );
}
  const moduloSeleccionado = modulos[seccionActiva];

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
      description={moduloSeleccionado.description}
    />
  );
}

export default App;