const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

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

export async function apiRequest(endpoint, options = {}) {
  const sesion = obtenerSesionGuardada();
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (sesion?.token) {
    headers.set("Authorization", `Bearer ${sesion.token}`);
  }

  const respuesta = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let resultado = null;

  try {
    resultado = await respuesta.json();
  } catch {
    resultado = null;
  }

  if (!respuesta.ok) {
    const error = new Error(
      resultado?.message ||
        `La solicitud falló con estado ${respuesta.status}.`,
    );

    error.status = respuesta.status;
    error.data = resultado;

    throw error;
  }

  return resultado;
}

export { API_URL };