import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
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

function App() {
  const [sesion, setSesion] = useState(obtenerSesionGuardada);

  const cerrarSesion = () => {
    localStorage.removeItem("sgcm_sesion");
    sessionStorage.removeItem("sgcm_sesion");
    setSesion(null);
  };

  if (!sesion) {
    return <LoginPage onLogin={setSesion} />;
  }

  return (
    <DashboardPage
      sesion={sesion}
      onLogout={cerrarSesion}
    />
  );
}

export default App;