import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { apiRequest } from "../services/api";

const crearDetalleVacio = () => ({
  productoId: "",
  cantidad: "1",
});

function SalesPage({
  sesion,
  onLogout,
  onNavigate,
}) {
  const [ventas, setVentas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] =
    useState("");

  const [procesandoVenta, setProcesandoVenta] =
    useState(null);

  const [procesandoPago, setProcesandoPago] =
    useState(null);

  const [reversandoPago, setReversandoPago] =
    useState(null);

  /*
   * =========================================================
   * ROL ACTUAL
   * =========================================================
   */

  const nombreRol =
    sesion.rol?.nombre ||
    sesion.usuario?.rol?.nombre ||
    "";

  const esAdministrador =
    nombreRol === "Administrador";

  /*
   * =========================================================
   * VENTA DIRECTA
   * =========================================================
   */

  const [
    mostrarVentaDirecta,
    setMostrarVentaDirecta,
  ] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);

  const [
    cargandoOpcionesVenta,
    setCargandoOpcionesVenta,
  ] = useState(false);

  const [guardandoVenta, setGuardandoVenta] =
    useState(false);

  const [errorVenta, setErrorVenta] =
    useState("");

  const [formularioVenta, setFormularioVenta] =
    useState({
      clienteId: "",
      observacion: "",
      detalles: [crearDetalleVacio()],
    });

  /*
   * =========================================================
   * CARGAR VENTAS
   * =========================================================
   */

  useEffect(() => {
    const cargarVentas = async () => {
      setCargando(true);
      setError("");

      try {
        const resultado = await apiRequest(
          "/ventas",
        );

        setVentas(
          resultado?.data?.ventas || [],
        );
      } catch (errorSolicitud) {
        if (errorSolicitud.status === 401) {
          onLogout();
          return;
        }

        setError(
          errorSolicitud.message ||
            "No fue posible cargar las ventas.",
        );
      } finally {
        setCargando(false);
      }
    };

    cargarVentas();
  }, [onLogout]);

  /*
   * =========================================================
   * RESULTADO DEL RETORNO WEBPAY
   * =========================================================
   */

  useEffect(() => {
    const parametros =
      new URLSearchParams(
        window.location.search,
      );

    const resultadoWebpay =
      parametros.get("webpay");

    if (!resultadoWebpay) {
      return;
    }

    const mensajesExito = {
      aprobado:
        "Pago aprobado correctamente. La venta fue confirmada y el stock fue descontado.",

      "reversado-stock":
        "El pago fue autorizado, pero el stock ya no estaba disponible. La transacción fue reversada automáticamente.",
    };

    const mensajesError = {
      rechazado:
        "El pago fue rechazado. La venta continúa pendiente y puedes realizar un nuevo intento.",

      cancelado:
        "El pago fue cancelado. La venta continúa pendiente de pago.",

      "no-encontrado":
        "No fue posible encontrar el intento de pago asociado al retorno de Webpay.",

      "error-stock":
        "El pago fue autorizado, pero hubo un problema al confirmar el stock. El caso requiere revisión administrativa.",

      error:
        "Ocurrió un problema al procesar el retorno de Webpay.",
    };

    if (mensajesExito[resultadoWebpay]) {
      setMensajeExito(
        mensajesExito[resultadoWebpay],
      );

      setError("");
    }

    if (mensajesError[resultadoWebpay]) {
      setError(
        mensajesError[resultadoWebpay],
      );

      setMensajeExito("");
    }

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname,
    );
  }, []);

  /*
   * =========================================================
   * FILTRO
   * =========================================================
   */

  const ventasFiltradas = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    if (!texto) {
      return ventas;
    }

    return ventas.filter((venta) => {
      const origen = venta.cotizacion
        ? "cotización"
        : "venta directa";

      const productosVenta =
        venta.detalles
          ?.map(
            (detalle) =>
              detalle.producto?.nombre,
          )
          .filter(Boolean)
          .join(" ") || "";

      const estadosPago =
        venta.pagos
          ?.map((pago) => pago.estado)
          .join(" ") || "";

      const campos = [
        venta.numero,
        venta.estado,
        venta.cliente?.nombre,
        venta.cliente?.rut,
        venta.usuario?.nombre,
        venta.cotizacion?.numero,
        origen,
        productosVenta,
        estadosPago,
      ];

      return campos.some((campo) =>
        String(campo || "")
          .toLowerCase()
          .includes(texto),
      );
    });
  }, [busqueda, ventas]);

  /*
   * =========================================================
   * FORMATEO
   * =========================================================
   */

  const formatearPrecio = (valor) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) {
      return "Fecha no disponible";
    }

    return new Date(
      fecha,
    ).toLocaleDateString("es-CL");
  };

  const obtenerClaseEstado = (estado) => {
    const clases = {
      PENDIENTE_PAGO:
        "quote-status quote-status-draft",

      CONFIRMADA:
        "quote-status quote-status-accepted",

      ANULADA:
        "quote-status quote-status-rejected",
    };

    return (
      clases[estado] ||
      "quote-status quote-status-draft"
    );
  };

  const redondearDinero = (valor) => {
    return (
      Math.round(
        (Number(valor) + Number.EPSILON) *
          100,
      ) / 100
    );
  };

  /*
   * =========================================================
   * PAGOS DE UNA VENTA
   * =========================================================
   */

  const obtenerPagoAprobado = (venta) => {
    return venta.pagos?.find(
      (pago) =>
        pago.estado === "APROBADO",
    );
  };

  const obtenerPagoPendiente = (venta) => {
    return venta.pagos?.find(
      (pago) =>
        pago.estado === "PENDIENTE",
    );
  };

  const obtenerUltimoPago = (venta) => {
    return venta.pagos?.[0] || null;
  };

  const obtenerTextoPago = (venta) => {
    const ultimoPago =
      obtenerUltimoPago(venta);

    if (!ultimoPago) {
      return "";
    }

    const textos = {
      PENDIENTE:
        "Webpay pendiente",

      APROBADO:
        "Webpay aprobado",

      RECHAZADO:
        "Último pago: RECHAZADO",

      ANULADO:
        "Webpay anulado",
    };

    return (
      textos[ultimoPago.estado] ||
      ultimoPago.estado
    );
  };

  /*
   * =========================================================
   * ABRIR NUEVA VENTA
   * =========================================================
   */

  const abrirVentaDirecta = async () => {
    setMostrarVentaDirecta(true);

    setFormularioVenta({
      clienteId: "",
      observacion: "",
      detalles: [crearDetalleVacio()],
    });

    setErrorVenta("");
    setMensajeExito("");
    setError("");

    setCargandoOpcionesVenta(true);

    try {
      const [
        resultadoClientes,
        resultadoProductos,
      ] = await Promise.all([
        apiRequest("/clientes"),
        apiRequest("/productos"),
      ]);

      setClientes(
        resultadoClientes?.data
          ?.clientes || [],
      );

      setProductos(
        resultadoProductos?.data
          ?.productos || [],
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setErrorVenta(
        errorSolicitud.message ||
          "No fue posible cargar clientes y productos.",
      );
    } finally {
      setCargandoOpcionesVenta(false);
    }
  };

  const cerrarVentaDirecta = () => {
    if (guardandoVenta) {
      return;
    }

    setMostrarVentaDirecta(false);
    setErrorVenta("");

    setFormularioVenta({
      clienteId: "",
      observacion: "",
      detalles: [crearDetalleVacio()],
    });
  };

  /*
   * =========================================================
   * OPCIONES DISPONIBLES
   * =========================================================
   */

  const clientesDisponibles = useMemo(() => {
    return clientes.filter(
      (cliente) => cliente.estado,
    );
  }, [clientes]);

  const productosDisponibles = useMemo(() => {
    return productos.filter(
      (producto) =>
        producto.estado &&
        producto.categoria?.estado !== false,
    );
  }, [productos]);

  /*
   * =========================================================
   * FORMULARIO VENTA DIRECTA
   * =========================================================
   */

  const actualizarCampoVenta = (evento) => {
    const { name, value } = evento.target;

    setFormularioVenta((actual) => ({
      ...actual,
      [name]: value,
    }));

    setErrorVenta("");
  };

  const actualizarDetalleVenta = (
    indice,
    campo,
    valor,
  ) => {
    setFormularioVenta((actual) => ({
      ...actual,

      detalles: actual.detalles.map(
        (detalle, posicion) =>
          posicion === indice
            ? {
                ...detalle,
                [campo]: valor,
              }
            : detalle,
      ),
    }));

    setErrorVenta("");
  };

  const agregarDetalleVenta = () => {
    setFormularioVenta((actual) => ({
      ...actual,

      detalles: [
        ...actual.detalles,
        crearDetalleVacio(),
      ],
    }));

    setErrorVenta("");
  };

  const eliminarDetalleVenta = (indice) => {
    if (
      formularioVenta.detalles.length === 1
    ) {
      setErrorVenta(
        "La venta debe contener al menos un producto.",
      );

      return;
    }

    setFormularioVenta((actual) => ({
      ...actual,

      detalles: actual.detalles.filter(
        (_, posicion) =>
          posicion !== indice,
      ),
    }));

    setErrorVenta("");
  };

  const obtenerProducto = (productoId) => {
    return productosDisponibles.find(
      (producto) =>
        producto.id === Number(productoId),
    );
  };

  const calcularSubtotalDetalle = (
    detalle,
  ) => {
    const producto = obtenerProducto(
      detalle.productoId,
    );

    const cantidad = Number(
      detalle.cantidad,
    );

    if (
      !producto ||
      !Number.isInteger(cantidad) ||
      cantidad <= 0
    ) {
      return 0;
    }

    return redondearDinero(
      Number(producto.precio) * cantidad,
    );
  };

  /*
   * =========================================================
   * IVA INCLUIDO
   * =========================================================
   */

  const totalVentaDirecta = useMemo(() => {
    return redondearDinero(
      formularioVenta.detalles.reduce(
        (total, detalle) =>
          total +
          calcularSubtotalDetalle(detalle),
        0,
      ),
    );
  }, [
    formularioVenta.detalles,
    productosDisponibles,
  ]);

  const subtotalNetoVenta = useMemo(() => {
    if (totalVentaDirecta <= 0) {
      return 0;
    }

    return redondearDinero(
      totalVentaDirecta / 1.19,
    );
  }, [totalVentaDirecta]);

  const montoIvaVenta = useMemo(() => {
    return redondearDinero(
      totalVentaDirecta -
        subtotalNetoVenta,
    );
  }, [
    totalVentaDirecta,
    subtotalNetoVenta,
  ]);

  /*
   * =========================================================
   * VALIDACIÓN
   * =========================================================
   */

  const validarVentaDirecta = () => {
    const clienteId = Number(
      formularioVenta.clienteId,
    );

    if (
      !Number.isInteger(clienteId) ||
      clienteId <= 0
    ) {
      return "Debes seleccionar un cliente.";
    }

    if (
      formularioVenta.detalles.length === 0
    ) {
      return "La venta debe contener al menos un producto.";
    }

    const productosSeleccionados =
      new Set();

    for (
      const detalle of
      formularioVenta.detalles
    ) {
      const productoId = Number(
        detalle.productoId,
      );

      const cantidad = Number(
        detalle.cantidad,
      );

      if (
        !Number.isInteger(productoId) ||
        productoId <= 0
      ) {
        return "Debes seleccionar un producto válido en cada línea.";
      }

      if (
        productosSeleccionados.has(
          productoId,
        )
      ) {
        return "Un producto no puede aparecer más de una vez en la venta.";
      }

      productosSeleccionados.add(
        productoId,
      );

      if (
        !Number.isInteger(cantidad) ||
        cantidad <= 0
      ) {
        return "La cantidad debe ser un número entero mayor que cero.";
      }

      const producto =
        obtenerProducto(productoId);

      if (!producto) {
        return "Uno de los productos seleccionados ya no se encuentra disponible.";
      }

      if (
        Number(producto.stock) < cantidad
      ) {
        return `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, requerido: ${cantidad}.`;
      }
    }

    return "";
  };

  /*
   * =========================================================
   * GUARDAR VENTA DIRECTA
   * =========================================================
   */

  const guardarVentaDirecta = async (
    evento,
  ) => {
    evento.preventDefault();

    const mensajeValidacion =
      validarVentaDirecta();

    if (mensajeValidacion) {
      setErrorVenta(mensajeValidacion);
      return;
    }

    setGuardandoVenta(true);
    setErrorVenta("");

    try {
      const datosVenta = {
        clienteId: Number(
          formularioVenta.clienteId,
        ),

        observacion:
          formularioVenta.observacion.trim() ||
          null,

        detalles:
          formularioVenta.detalles.map(
            (detalle) => ({
              productoId: Number(
                detalle.productoId,
              ),

              cantidad: Number(
                detalle.cantidad,
              ),
            }),
          ),
      };

      const resultado = await apiRequest(
        "/ventas",
        {
          method: "POST",

          body: JSON.stringify(
            datosVenta,
          ),
        },
      );

      const ventaCreada =
        resultado.data.venta;

      setVentas((actuales) => [
        ventaCreada,
        ...actuales,
      ]);

      setMensajeExito(
        `${ventaCreada.numero} fue creada correctamente. Ahora debes completar el pago con Webpay.`,
      );

      setMostrarVentaDirecta(false);

      setFormularioVenta({
        clienteId: "",
        observacion: "",
        detalles: [crearDetalleVacio()],
      });
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setErrorVenta(
        errorSolicitud.message ||
          "No fue posible registrar la venta directa.",
      );
    } finally {
      setGuardandoVenta(false);
    }
  };

  /*
   * =========================================================
   * INICIAR PAGO WEBPAY
   * =========================================================
   */

  const iniciarPagoWebpay = async (venta) => {
    setProcesandoPago(venta.id);
    setError("");
    setMensajeExito("");

    try {
      const resultado = await apiRequest(
        `/pagos/iniciar/${venta.id}`,
        {
          method: "POST",
        },
      );

      const urlWebpay =
        resultado?.data?.webpay?.url;

      const tokenWebpay =
        resultado?.data?.webpay?.token;

      if (
        !urlWebpay ||
        !tokenWebpay
      ) {
        throw new Error(
          "Webpay no entregó los datos necesarios para continuar con el pago.",
        );
      }

      const formulario =
        document.createElement("form");

      formulario.method = "POST";
      formulario.action = urlWebpay;
      formulario.style.display = "none";

      const campoToken =
        document.createElement("input");

      campoToken.type = "hidden";
      campoToken.name = "token_ws";
      campoToken.value = tokenWebpay;

      formulario.appendChild(
        campoToken,
      );

      document.body.appendChild(
        formulario,
      );

      formulario.submit();
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible iniciar el pago con Webpay.",
      );

      setProcesandoPago(null);
    }
  };

  /*
   * =========================================================
   * ANULAR VENTA SIN PAGO WEBPAY APROBADO
   * =========================================================
   */

  const anularVenta = async (venta) => {
    const esPendiente =
      venta.estado ===
      "PENDIENTE_PAGO";

    const confirmar = window.confirm(
      esPendiente
        ? `¿Seguro que deseas anular ${venta.numero}?\n\nLa venta todavía no ha sido pagada y no se ha descontado stock.`
        : `¿Seguro que deseas anular ${venta.numero}?\n\nEl stock vendido será devuelto.`,
    );

    if (!confirmar) {
      return;
    }

    setProcesandoVenta(venta.id);
    setError("");
    setMensajeExito("");

    try {
      const resultado = await apiRequest(
        `/ventas/${venta.id}/anular`,
        {
          method: "PATCH",
        },
      );

      const ventaActualizada =
        resultado.data.venta;

      setVentas((actuales) =>
        actuales.map((actual) =>
          actual.id === ventaActualizada.id
            ? ventaActualizada
            : actual,
        ),
      );

      setMensajeExito(
        resultado.message ||
          "Venta anulada correctamente.",
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible anular la venta.",
      );
    } finally {
      setProcesandoVenta(null);
    }
  };

  /*
   * =========================================================
   * REVERSAR PAGO WEBPAY
   * =========================================================
   *
   * Solo el Administrador ve esta acción.
   *
   * Pago APROBADO
   *      ↓
   * Transbank refund()
   *      ↓
   * Pago ANULADO
   *      ↓
   * Venta ANULADA
   *      ↓
   * Stock restaurado
   *      ↓
   * Movimiento ENTRADA
   * =========================================================
   */

  const reversarPagoWebpay = async (
    venta,
    pago,
  ) => {
    const confirmar = window.confirm(
      `¿Seguro que deseas anular el pago Webpay de ${venta.numero}?\n\nSe solicitará la reversa a Transbank, la venta quedará ANULADA y las unidades serán devueltas a Productos.`,
    );

    if (!confirmar) {
      return;
    }

    setReversandoPago(pago.id);
    setError("");
    setMensajeExito("");

    try {
      const resultado = await apiRequest(
        `/pagos/${pago.id}/anular`,
        {
          method: "POST",
        },
      );

      /*
       * Consultamos nuevamente la venta para
       * obtener su estado, pagos y relaciones
       * completas después de la reversa.
       */
      const resultadoVenta =
        await apiRequest(
          `/ventas/${venta.id}`,
        );

      const ventaActualizada =
        resultadoVenta.data.venta;

      setVentas((actuales) =>
        actuales.map((actual) =>
          actual.id === ventaActualizada.id
            ? ventaActualizada
            : actual,
        ),
      );

      setMensajeExito(
        resultado.message ||
          "Pago Webpay anulado correctamente.",
      );
    } catch (errorSolicitud) {
      if (errorSolicitud.status === 401) {
        onLogout();
        return;
      }

      setError(
        errorSolicitud.message ||
          "No fue posible anular el pago Webpay.",
      );
    } finally {
      setReversandoPago(null);
    }
  };

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <AppLayout
      sesion={sesion}
      onLogout={onLogout}
      activeSection="ventas"
      onNavigate={onNavigate}
    >
      <section className="page-heading products-heading">
        <div>
          <p className="page-eyebrow">
            Gestión comercial
          </p>

          <h1>Ventas</h1>

          <p>
            Registra ventas directas o consulta
            ventas generadas desde cotizaciones,
            controlando IVA, pago Webpay,
            stock y estado.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-primary-button"
          onClick={abrirVentaDirecta}
        >
          <Plus size={19} />
          Nueva venta
        </button>
      </section>

      {mensajeExito && (
        <div
          className="product-success-message"
          role="status"
        >
          {mensajeExito}
        </div>
      )}

      {error && (
        <div
          className="error-message"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="products-card">
        <div className="products-toolbar">
          <div className="products-summary">
            <div className="products-summary-icon">
              <ShoppingCart size={22} />
            </div>

            <div>
              <span>
                Ventas registradas
              </span>

              <strong>
                {ventas.length}
              </strong>
            </div>
          </div>

          <label className="products-search">
            <Search size={19} />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value,
                )
              }
              placeholder="Buscar por venta, cliente, producto, cotización, pago, origen o estado"
              aria-label="Buscar ventas"
            />
          </label>
        </div>

        {cargando ? (
          <div className="products-loading">
            <LoaderCircle
              className="spinner"
              size={36}
            />

            <p>Cargando ventas...</p>
          </div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="empty-dashboard-state">
            <TriangleAlert size={34} />

            <strong>
              {ventas.length === 0
                ? "No hay ventas registradas"
                : "No se encontraron resultados"}
            </strong>

            <p>
              {ventas.length === 0
                ? "Las ventas directas y las cotizaciones convertidas aparecerán en esta sección."
                : "Prueba utilizando otro número de venta, cliente, producto, cotización, pago, origen o estado."}
            </p>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table quote-table">
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Cliente</th>
                  <th>Origen</th>
                  <th>Productos vendidos</th>
                  <th>Fecha</th>
                  <th>IVA</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {ventasFiltradas.map(
                  (venta) => {
                    const pagoAprobado =
                      obtenerPagoAprobado(
                        venta,
                      );

                    const pagoPendiente =
                      obtenerPagoPendiente(
                        venta,
                      );

                    const textoPago =
                      obtenerTextoPago(
                        venta,
                      );

                    return (
                      <tr key={venta.id}>
                        <td>
                          <div className="user-main-data">
                            <strong>
                              {venta.numero}
                            </strong>

                            <small>
                              {venta.usuario
                                ?.nombre ||
                                "Usuario no disponible"}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="user-main-data">
                            <strong>
                              {venta.cliente
                                ?.nombre ||
                                "Cliente no disponible"}
                            </strong>

                            <small>
                              {venta.cliente
                                ?.rut || ""}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="user-main-data">
                            <strong>
                              {venta.cotizacion
                                ?.numero ||
                                "Venta directa"}
                            </strong>

                            <small>
                              {venta.cotizacion
                                ? "Cotización convertida"
                                : "Sin cotización asociada"}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="user-main-data">
                            {venta.detalles?.length >
                            0 ? (
                              venta.detalles.map(
                                (detalle) => (
                                  <div
                                    key={
                                      detalle.id
                                    }
                                  >
                                    <strong>
                                      {detalle
                                        .producto
                                        ?.nombre ||
                                        "Producto no disponible"}
                                    </strong>

                                    <small>
                                      {
                                        detalle.cantidad
                                      }{" "}
                                      {detalle.cantidad ===
                                      1
                                        ? "unidad"
                                        : "unidades"}{" "}
                                      ×{" "}
                                      {formatearPrecio(
                                        detalle.precioUnitario,
                                      )}
                                    </small>
                                  </div>
                                ),
                              )
                            ) : (
                              <small>
                                Sin detalle de
                                productos
                              </small>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="user-main-data">
                            <small>
                              {formatearFecha(
                                venta.fechaCreacion,
                              )}
                            </small>
                          </div>
                        </td>

                        <td>
                          {venta.montoIva != null ? (
                            <div className="user-main-data">
                              <strong>
                                {formatearPrecio(
                                  venta.montoIva,
                                )}
                              </strong>

                              <small>
                                Neto:{" "}
                                {formatearPrecio(
                                  venta.subtotalNeto,
                                )}
                              </small>
                            </div>
                          ) : (
                            <small>
                              Venta histórica
                            </small>
                          )}
                        </td>

                        <td>
                          <strong>
                            {formatearPrecio(
                              venta.total,
                            )}
                          </strong>
                        </td>

                        <td>
                          <div className="user-main-data">
                            <span
                              className={obtenerClaseEstado(
                                venta.estado,
                              )}
                            >
                              {venta.estado}
                            </span>

                            {textoPago && (
                              <small>
                                {textoPago}
                              </small>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="product-actions quote-actions">
                            {venta.estado ===
                              "PENDIENTE_PAGO" && (
                              <>
                                <button
                                  type="button"
                                  className="dashboard-primary-button"
                                  onClick={() =>
                                    iniciarPagoWebpay(
                                      venta,
                                    )
                                  }
                                  disabled={
                                    procesandoPago ===
                                      venta.id ||
                                    Boolean(
                                      pagoPendiente,
                                    )
                                  }
                                >
                                  {procesandoPago ===
                                  venta.id ? (
                                    <LoaderCircle
                                      className="spinner"
                                      size={17}
                                    />
                                  ) : (
                                    <CreditCard
                                      size={17}
                                    />
                                  )}

                                  {pagoPendiente
                                    ? "Pago iniciado"
                                    : "Pagar con Webpay"}
                                </button>

                                {!pagoPendiente && (
                                  <button
                                    type="button"
                                    className="quote-action-button quote-action-danger"
                                    onClick={() =>
                                      anularVenta(
                                        venta,
                                      )
                                    }
                                    disabled={
                                      procesandoVenta ===
                                      venta.id
                                    }
                                  >
                                    {procesandoVenta ===
                                    venta.id ? (
                                      <LoaderCircle
                                        className="spinner"
                                        size={17}
                                      />
                                    ) : (
                                      <XCircle
                                        size={17}
                                      />
                                    )}

                                    Anular
                                  </button>
                                )}
                              </>
                            )}

                            {venta.estado ===
                              "CONFIRMADA" &&
                              pagoAprobado &&
                              esAdministrador && (
                                <button
                                  type="button"
                                  className="quote-action-button quote-action-danger"
                                  onClick={() =>
                                    reversarPagoWebpay(
                                      venta,
                                      pagoAprobado,
                                    )
                                  }
                                  disabled={
                                    reversandoPago ===
                                    pagoAprobado.id
                                  }
                                >
                                  {reversandoPago ===
                                  pagoAprobado.id ? (
                                    <LoaderCircle
                                      className="spinner"
                                      size={17}
                                    />
                                  ) : (
                                    <RotateCcw
                                      size={17}
                                    />
                                  )}

                                  Anular pago
                                </button>
                              )}

                            {venta.estado ===
                              "CONFIRMADA" &&
                              pagoAprobado &&
                              !esAdministrador && (
                                <span className="user-action-restriction">
                                  Pago Webpay aprobado
                                </span>
                              )}

                            {venta.estado ===
                              "CONFIRMADA" &&
                              !pagoAprobado && (
                                <button
                                  type="button"
                                  className="quote-action-button quote-action-danger"
                                  onClick={() =>
                                    anularVenta(
                                      venta,
                                    )
                                  }
                                  disabled={
                                    procesandoVenta ===
                                    venta.id
                                  }
                                >
                                  {procesandoVenta ===
                                  venta.id ? (
                                    <LoaderCircle
                                      className="spinner"
                                      size={17}
                                    />
                                  ) : (
                                    <XCircle
                                      size={17}
                                    />
                                  )}

                                  Anular
                                </button>
                              )}

                            {venta.estado ===
                              "ANULADA" && (
                              <span className="user-action-restriction">
                                Venta anulada
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarVentaDirecta && (
        <div className="modal-backdrop">
          <section
            className="product-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="direct-sale-title"
          >
            <header className="product-form-header">
              <div className="product-form-title">
                <div className="product-form-title-icon">
                  <ShoppingCart size={24} />
                </div>

                <div>
                  <p className="page-eyebrow">
                    Venta en tienda
                  </p>

                  <h2 id="direct-sale-title">
                    Nueva venta
                  </h2>
                </div>
              </div>

              <button
                type="button"
                className="product-form-close"
                onClick={
                  cerrarVentaDirecta
                }
                disabled={
                  guardandoVenta
                }
                aria-label="Cerrar formulario"
              >
                <X size={21} />
              </button>
            </header>

            <form
              className="product-form"
              onSubmit={
                guardarVentaDirecta
              }
            >
              {errorVenta && (
                <div
                  className="error-message"
                  role="alert"
                >
                  {errorVenta}
                </div>
              )}

              {cargandoOpcionesVenta ? (
                <div className="products-loading">
                  <LoaderCircle
                    className="spinner"
                    size={34}
                  />

                  <p>
                    Cargando clientes y
                    productos...
                  </p>
                </div>
              ) : (
                <>
                  <div className="product-form-grid">
                    <label className="product-form-field product-form-field-full">
                      <span>Cliente</span>

                      <select
                        name="clienteId"
                        value={
                          formularioVenta.clienteId
                        }
                        onChange={
                          actualizarCampoVenta
                        }
                        required
                        disabled={
                          guardandoVenta
                        }
                      >
                        <option value="">
                          Selecciona un
                          cliente
                        </option>

                        {clientesDisponibles.map(
                          (cliente) => (
                            <option
                              key={
                                cliente.id
                              }
                              value={
                                cliente.id
                              }
                            >
                              {
                                cliente.nombre
                              }{" "}
                              — {cliente.rut}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="product-form-field product-form-field-full">
                      <span>
                        Observación
                      </span>

                      <textarea
                        name="observacion"
                        value={
                          formularioVenta.observacion
                        }
                        onChange={
                          actualizarCampoVenta
                        }
                        rows="3"
                        placeholder="Ejemplo: Venta realizada en tienda"
                        disabled={
                          guardandoVenta
                        }
                      />

                      <small>
                        Campo opcional.
                      </small>
                    </label>
                  </div>

                  <div className="purchase-order-products-heading">
                    <div>
                      <strong>
                        Productos de la
                        venta
                      </strong>

                      <small>
                        El precio se obtiene
                        directamente del
                        catálogo.
                      </small>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        agregarDetalleVenta
                      }
                      disabled={
                        guardandoVenta
                      }
                    >
                      <Plus size={17} />
                      Agregar producto
                    </button>
                  </div>

                  <div className="purchase-order-details">
                    {formularioVenta.detalles.map(
                      (
                        detalle,
                        indice,
                      ) => {
                        const producto =
                          obtenerProducto(
                            detalle.productoId,
                          );

                        const subtotalLinea =
                          calcularSubtotalDetalle(
                            detalle,
                          );

                        return (
                          <article
                            className="purchase-order-detail"
                            key={
                              indice
                            }
                          >
                            <div className="product-form-grid">
                              <label className="product-form-field product-form-field-full">
                                <span>
                                  Producto{" "}
                                  {indice +
                                    1}
                                </span>

                                <select
                                  value={
                                    detalle.productoId
                                  }
                                  onChange={(
                                    evento,
                                  ) =>
                                    actualizarDetalleVenta(
                                      indice,
                                      "productoId",
                                      evento
                                        .target
                                        .value,
                                    )
                                  }
                                  required
                                  disabled={
                                    guardandoVenta
                                  }
                                >
                                  <option value="">
                                    Selecciona
                                    un producto
                                  </option>

                                  {productosDisponibles.map(
                                    (
                                      productoOpcion,
                                    ) => (
                                      <option
                                        key={
                                          productoOpcion.id
                                        }
                                        value={
                                          productoOpcion.id
                                        }
                                      >
                                        {
                                          productoOpcion.nombre
                                        }{" "}
                                        —{" "}
                                        {formatearPrecio(
                                          productoOpcion.precio,
                                        )}{" "}
                                        — Stock:{" "}
                                        {
                                          productoOpcion.stock
                                        }
                                      </option>
                                    ),
                                  )}
                                </select>
                              </label>

                              <label className="product-form-field">
                                <span>
                                  Cantidad
                                </span>

                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={
                                    detalle.cantidad
                                  }
                                  onChange={(
                                    evento,
                                  ) =>
                                    actualizarDetalleVenta(
                                      indice,
                                      "cantidad",
                                      evento
                                        .target
                                        .value,
                                    )
                                  }
                                  required
                                  disabled={
                                    guardandoVenta
                                  }
                                />
                              </label>

                              <label className="product-form-field">
                                <span>
                                  Precio
                                  unitario
                                </span>

                                <input
                                  type="text"
                                  value={
                                    producto
                                      ? formatearPrecio(
                                          producto.precio,
                                        )
                                      : "$0"
                                  }
                                  readOnly
                                />

                                <small>
                                  IVA incluido.
                                </small>
                              </label>
                            </div>

                            <div className="purchase-order-detail-footer">
                              <span>
                                Subtotal:{" "}
                                <strong>
                                  {formatearPrecio(
                                    subtotalLinea,
                                  )}
                                </strong>
                              </span>

                              <button
                                type="button"
                                className="product-state-button product-state-button-danger"
                                onClick={() =>
                                  eliminarDetalleVenta(
                                    indice,
                                  )
                                }
                                disabled={
                                  guardandoVenta ||
                                  formularioVenta
                                    .detalles
                                    .length ===
                                    1
                                }
                              >
                                <Trash2
                                  size={16}
                                />
                                Quitar
                              </button>
                            </div>
                          </article>
                        );
                      },
                    )}
                  </div>

                  <section className="purchase-order-totals">
                    <div>
                      <span>Neto</span>

                      <strong>
                        {formatearPrecio(
                          subtotalNetoVenta,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        IVA 19%
                      </span>

                      <strong>
                        {formatearPrecio(
                          montoIvaVenta,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Total</span>

                      <strong>
                        {formatearPrecio(
                          totalVentaDirecta,
                        )}
                      </strong>
                    </div>

                    <small>
                      Los precios del
                      catálogo ya incluyen
                      IVA. El sistema
                      desglosa el Neto y el
                      IVA sin aumentar el
                      precio final. Los
                      valores definitivos se
                      calculan nuevamente en
                      el backend.
                    </small>
                  </section>

                  <div className="product-info-message">
                    <CreditCard size={18} />

                    <span>
                      Al crear la venta quedará
                      pendiente de pago. El stock
                      se descontará únicamente
                      cuando Webpay confirme la
                      transacción.
                    </span>
                  </div>

                  <footer className="product-form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        cerrarVentaDirecta
                      }
                      disabled={
                        guardandoVenta
                      }
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="dashboard-primary-button"
                      disabled={
                        guardandoVenta ||
                        clientesDisponibles.length ===
                          0 ||
                        productosDisponibles.length ===
                          0
                      }
                    >
                      {guardandoVenta ? (
                        <>
                          <LoaderCircle
                            className="spinner"
                            size={19}
                          />
                          Creando...
                        </>
                      ) : (
                        <>
                          <Save size={19} />
                          Crear venta
                        </>
                      )}
                    </button>
                  </footer>
                </>
              )}
            </form>
          </section>
        </div>
      )}
    </AppLayout>
  );
}

export default SalesPage;