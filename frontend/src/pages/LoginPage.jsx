import { useState } from "react";
import {
  Building2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function LoginPage({ onLogin }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordarSesion, setRecordarSesion] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const iniciarSesion = async (event) => {
    event.preventDefault();
    setError("");
    setCargando(true);

    try {
      const respuesta = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correo: correo.trim(),
          password,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.message || "No fue posible iniciar sesión.",
        );
      }

      const usuario = resultado.data.usuario;

      const datosSesion = {
        token: resultado.data.token,
        usuario,
        empresa: usuario.empresa,
        rol: usuario.rol,
      };

      localStorage.removeItem("sgcm_sesion");
      sessionStorage.removeItem("sgcm_sesion");

      if (recordarSesion) {
        localStorage.setItem("sgcm_sesion", JSON.stringify(datosSesion));
      } else {
        sessionStorage.setItem("sgcm_sesion", JSON.stringify(datosSesion));
      }

      onLogin(datosSesion);
    } catch (errorSolicitud) {
      if (errorSolicitud instanceof TypeError) {
        setError(
          "No fue posible conectar con el servidor. Comprueba que el backend esté funcionando.",
        );
      } else {
        setError(errorSolicitud.message);
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login-page">
      <section className="brand-panel">
        <div className="brand-content">
          <div className="brand-logo">
            <Building2 size={34} />
          </div>

          <p className="brand-code">SGCM</p>

          <h1>Gestión comercial para empresas que quieren crecer.</h1>

          <p>
            Centraliza productos, clientes, usuarios y movimientos de
            inventario en una plataforma segura y multiempresa.
          </p>

          <div className="brand-feature">
            <ShieldCheck size={22} />
            <span>Acceso protegido mediante JWT y permisos por rol.</span>
          </div>
        </div>
      </section>

      <section className="form-panel">
        <div className="login-card">
          <div className="mobile-logo">
            <Building2 size={30} />
          </div>

          <p className="eyebrow">
            Sistema de Gestión Comercial Multiempresa
          </p>

          <h2>Iniciar sesión</h2>

          <p className="form-description">
            Ingresa con las credenciales asignadas a tu empresa.
          </p>

          <form onSubmit={iniciarSesion}>
            <label htmlFor="correo">Correo electrónico</label>

            <div className="input-wrapper">
              <Mail size={19} />

              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                placeholder="nombre@empresa.cl"
                autoComplete="email"
                required
              />
            </div>

            <label htmlFor="password">Contraseña</label>

            <div className="input-wrapper">
              <LockKeyhole size={19} />

              <input
                id="password"
                type={mostrarPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-button"
                onClick={() =>
                  setMostrarPassword((valorActual) => !valorActual)
                }
                aria-label={
                  mostrarPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                {mostrarPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>

            <label className="remember-option">
              <input
                type="checkbox"
                checked={recordarSesion}
                onChange={(event) =>
                  setRecordarSesion(event.target.checked)
                }
              />

              Recordar sesión en este equipo
            </label>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <LoaderCircle className="spinner" size={19} />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          <footer>
            © 2026 Sistema de Gestión Comercial Multiempresa
          </footer>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;