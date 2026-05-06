// ============================================================
//  LÓGICA FRONTEND COMPLETA - CONSUMO DE BACKEND PYTHON
//  Archivo: app.js
//  Descripción: Obtiene datos reales de PostgreSQL, evalúa
//  reglas de inasistencia (Atrasos >=3 o Faltas >=1) y
//  renderiza la tabla visualmente.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener la referencia al selector desplegable de periodo
    const selectorPeriodo = document.getElementById('periodo');
    
    // 2. Al cargar la página por primera vez, obtener datos con el filtro actual (mensual por defecto)
    cargarDatosAsistencia(selectorPeriodo.value);

    // 3. Escuchar cambios en el filtro (Cuando el usuario cambia entre Semanal, Mensual, Anual)
    selectorPeriodo.addEventListener('change', (evento) => {
        const periodoSeleccionado = evento.target.value;
        cargarDatosAsistencia(periodoSeleccionado);
    });
});

/**
 * Función principal asíncrona para obtener datos reales del servidor Python
 * @param {string} periodo - Puede ser 'semanal', 'mensual' o 'anual'
 */
async function cargarDatosAsistencia(periodo) {
    const tbody = document.getElementById('tabla-cuerpo');
    // Mostrar estado de carga mientras se espera la respuesta de la red local
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Conectando con la Base de Datos... <i class="fa-solid fa-spinner fa-spin"></i></td></tr>';

    try {
        // =================================================================
        // CONEXIÓN REAL AL BACKEND FASTAPI (PYTHON)
        // Nota: Asegúrate de que la IP sea localhost o la IP de tu servidor
        // =================================================================
        const respuestaHTTP = await fetch(`http://localhost:8000/api/reporte?periodo=${periodo}`);
        
        // Verificar si el servidor respondió con un error (ej. 404, 500)
        if (!respuestaHTTP.ok) {
            throw new Error(`Error del Servidor: Código HTTP ${respuestaHTTP.status}`);
        }

        // Convertir la respuesta del servidor a formato JSON (Array de objetos)
        const datosDelServidor = await respuestaHTTP.json();
        
        // Enviar los datos obtenidos a las funciones de renderizado visual
        renderizarTabla(datosDelServidor);
        actualizarTarjetasResumen(datosDelServidor);

    } catch (error) {
        // Manejo de errores de red (Ej: Servidor Python apagado, cable desconectado)
        console.error("Fallo crítico en la conexión Frontend-Backend:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="color:#b91c1c; text-align:center; font-weight:bold; background-color:#fee2e2; padding: 20px;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:24px; display:block; margin-bottom:10px;"></i>
                    Error de Conexión: No se pudo contactar al servidor PostgreSQL.<br>
                    <span style="font-weight:normal; font-size:14px;">Verifique que main.py esté en ejecución y la red WiFi esté activa.</span>
                </td>
            </tr>`;
        
        // Poner contadores a cero en caso de error
        document.getElementById('total-users').innerText = "0";
        document.getElementById('total-alerts').innerText = "0";
    }
}

/**
 * Recibe el JSON de PostgreSQL y dibuja el código HTML en el DOM
 * aplicando la lógica de negocio (Alertas Rojas)
 * @param {Array} datos - Lista de usuarios con sus estadísticas
 */
function renderizarTabla(datos) {
    const tbody = document.getElementById('tabla-cuerpo');
    tbody.innerHTML = ''; // Limpiar la tabla de cargas anteriores

    // Si la base de datos está vacía, mostrar mensaje amigable
    if (datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#6b7280;">No hay registros de asistencia para este periodo.</td></tr>';
        return;
    }

    // Iterar sobre cada usuario devuelto por la base de datos
    datos.forEach(usuario => {
        const fila = document.createElement('tr');
        let estadoBadge = '';
        let claseFila = '';

        // =========================================================
        // REGLA DE NEGOCIO ESTRICTA Y VISUAL (NIVEL PROFESIONAL):
        // Condición: >= 3 atrasos O >= 1 falta = ALERTA ROJA
        // =========================================================
        if (usuario.faltas >= 1 || usuario.atrasos >= 3) {
            claseFila = 'alerta-critica'; // Esta clase en CSS pone el fondo rojo y borde grueso
            estadoBadge = '<span class="badge danger" title="Requiere revisión administrativa"><i class="fa-solid fa-triangle-exclamation"></i> En Riesgo</span>';
        } else {
            estadoBadge = '<span class="badge ok"><i class="fa-solid fa-check-double"></i> Regular</span>';
        }

        // Aplicar la clase de alerta a la fila si se cumplió la condición
        if (claseFila) {
            fila.classList.add(claseFila);
        }

        // Construir la estructura HTML de las celdas usando Template Literals
        // Se formatea el ID de huella para que tenga 3 dígitos (ej: 001, 002)
        fila.innerHTML = `
            <td>#${usuario.huella_id.toString().padStart(3, '0')}</td>
            <td><strong>${usuario.nombre}</strong></td>
            <td>${usuario.ci || 'Sin Registrar'}</td>
            <td><span style="color:#166534; font-weight:600;">${usuario.asistencias}</span></td>
            <td>${usuario.atrasos}</td>
            <td>${usuario.faltas}</td>
            <td>${estadoBadge}</td>
        `;
        
        // Insertar la fila recién creada dentro de la tabla en el documento
        tbody.appendChild(fila);
    });
}

/**
 * Actualiza los cuadros numéricos superiores en el panel de control
 * @param {Array} datos - Lista de usuarios
 */
function actualizarTarjetasResumen(datos) {
    // El total de usuarios es simplemente el tamaño del array de respuesta
    const totalUsuarios = datos.length;
    
    // Usamos filter() para contar cuántos usuarios cumplen la regla de riesgo
    const totalAlertas = datos.filter(u => u.faltas >= 1 || u.atrasos >= 3).length;

    // Actualizar el DOM
    document.getElementById('total-users').innerText = totalUsuarios;
    document.getElementById('total-alerts').innerText = totalAlertas;
}

/**
 * Función para exportar la tabla actual
 * (Requiere implementación de librería externa como jsPDF para<div align="center">
  <h2>Tema: Desarrollo de Lógica Frontend y Consumo API | Título: Implementación Definitiva de app.js</h2>
  <h3><span style="color: blue;">Módulo 5</span></h3>
</div>

Para comprender a cabalidad el funcionamiento del archivo `app.js` que gobernarán la interfaz de administración, es imperativo realizar una inmersión teórica profunda en los paradigmas de programación que sustentan el ecosistema de JavaScript moderno en el navegador. La lógica que implementaremos no es un simple script secuencial, sino una arquitectura reactiva y asíncrona diseñada para interactuar con sistemas distribuidos (nuestro backend en Python y la base de datos PostgreSQL).

### Fundamentos Teóricos del Entorno de Ejecución JavaScript y Manipulación del DOM

JavaScript, en el contexto del navegador web, opera bajo un modelo de un solo hilo (single-threaded) basado en un ciclo de eventos (Event Loop). Esto significa que el hilo principal es responsable tanto de ejecutar el código JavaScript como de renderizar la interfaz de usuario (el HTML y CSS). Si escribiéramos código bloqueante (operaciones que tardan mucho tiempo en completarse, como esperar una respuesta de una red WiFi o buscar en una base de datos gigante), la página web entera se "congelaría", impidiendo que el administrador del sistema pueda hacer clic en otros botones o hacer scroll.

Para evitar este colapso, la arquitectura de nuestro `app.js` delega las tareas pesadas de red a las APIs web del navegador mediante el paradigma de la asincronía. Cuando solicitamos el reporte de inasistencias de los estudiantes o el personal al backend, JavaScript no se detiene a esperar. En su lugar, emite la solicitud HTTP y continúa "escuchando" otros eventos (como clics en el menú o pulsaciones de teclas). Una vez que Python y PostgreSQL han procesado los datos y los devuelven a través de la red local, el navegador coloca esa respuesta en la cola de microtareas (Microtask Queue). En el siguiente ciclo del Event Loop, JavaScript recoge esos datos y ejecuta la función encargada de actualizar la tabla visual.

#### El Modelo de Objetos del Documento (DOM) y la Renderización Dinámica

El DOM es una interfaz de programación de aplicaciones (API) para documentos HTML. Representa la página web como un árbol de nodos, donde cada etiqueta HTML es un objeto que puede ser manipulado matemáticamente por JavaScript. En nuestro panel de asistencia, la tabla HTML inicialmente está vacía. La responsabilidad de `app.js` es inyectar el contenido dinámicamente.

El proceso técnico implica:
1.  **Selección de Nodos:** Utilizando métodos como `document.getElementById()`, capturamos la referencia exacta al cuerpo de nuestra tabla (`<tbody>`).
2.  **Destrucción y Recreación (Reflow/Repaint):** Antes de insertar nuevos datos (por ejemplo, al cambiar la vista de "Semanal" a "Mensual"), debemos vaciar el contenido anterior ajustando la propiedad `innerHTML = ''`.
3.  **Iteración de Estructuras de Datos:** El backend nos devuelve un Array de Objetos JSON. Utilizamos iteradores de orden superior como `.forEach()` para recorrer cada objeto (cada estudiante y sus estadísticas de asistencia).
4.  **Generación de Plantillas Literales (Template Literals):** En lugar de concatenar cadenas de texto complejas (lo cual es propenso a errores de sintaxis y vulnerabilidades de inyección), utilizamos las plantillas literales introducidas en ECMAScript 6 (ES6), delimitadas por acentos graves (`` ` ``). Esto nos permite incrustar variables directamente en bloques de código HTML multilínea, facilitando la creación de etiquetas `<tr>` (filas) y `<td>` (celdas) con las clases CSS dinámicas (como `.alerta-critica`).
5.  **Inyección en el DOM:** Finalmente, anexamos estos nuevos nodos al árbol del documento usando `appendChild()`, lo que desencadena que el motor de renderizado del navegador dibuje visualmente los datos y colores en la pantalla del administrador.

#### La API Fetch y las Promesas (Promises)

La comunicación entre nuestra aplicación Frontend y el servidor FastAPI en Python se realiza a través del protocolo HTTP. Tradicionalmente, esto se hacía con el objeto `XMLHttpRequest`, pero en la ingeniería de software contemporánea, se utiliza la API `Fetch`. 

`fetch()` es una función global que devuelve una Promesa. Una Promesa en JavaScript es un objeto que representa la terminación o el fracaso eventual de una operación asíncrona. Tiene tres estados:
*   **Pending (Pendiente):** La solicitud ha sido enviada al ESP32 o al servidor Python, pero aún no hay respuesta.
*   **Fulfilled (Cumplida):** El servidor respondió con éxito (Código HTTP 200 OK) y entregó el JSON con el historial de accesos.
*   **Rejected (Rechazada):** Hubo un error crítico (el cable de red está desconectado, el servidor está apagado o hay un problema de permisos CORS).

Para manejar estas promesas de manera legible y estructurada, nuestro código emplea la sintaxis `async / await`. Al declarar la función `cargarDatosAsistencia` con la palabra reservada `async`, le indicamos al motor de JavaScript que dentro de esta función habrá operaciones asíncronas. El operador `await` pausa la ejecución lógica (dentro del contexto de la función, no del hilo principal) hasta que la promesa de `fetch` se resuelva. Posteriormente, usamos otro `await` para analizar el cuerpo de la respuesta mediante el método `.json()`.

#### Lógica de Negocio y Reglas Estrictas de Asistencia

Una parte vital del código recae en el análisis condicional de los datos. El requerimiento establece que cualquier usuario con 3 o más atrasos, o 1 o más faltas injustificadas, debe ser inmediatamente resaltado en la interfaz.

A nivel de código, esto se traduce en una evaluación lógica estricta (Strict Evaluation):
`if (usuario.faltas >= 1 || usuario.atrasos >= 3) { ... }`

Si esta evaluación retorna `true` (Verdadero), el script asigna la clase CSS `alerta-critica` a la fila de la tabla y modifica la insignia (Badge) a un estado de riesgo, inyectando un ícono de advertencia de FontAwesome y cambiando el esquema de colores a rojo intenso (`var(--danger-text)`). Esto asegura que la interfaz no solo muestra datos crudos, sino que toma decisiones activas para alertar al personal administrativo basándose en métricas exactas calculadas matemáticamente.

### Código Fuente Completo de app.js

A continuación, se presenta el código íntegro, combinando la escucha de eventos del DOM, la renderización visual y la conexión HTTP real hacia la base de datos PostgreSQL gestionada por Python.
```javascript
// ============================================================
//  LÓGICA FRONTEND COMPLETA - CONSUMO DE BACKEND PYTHON
//  Archivo: app.js
//  Descripción: Obtiene datos reales de PostgreSQL, evalúa
//  reglas de inasistencia (Atrasos >=3 o Faltas >=1) y
//  renderiza la tabla visualmente.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener la referencia al selector desplegable de periodo
    const selectorPeriodo = document.getElementById('periodo');
    
    // 2. Al cargar la página por primera vez, obtener datos con el filtro actual (mensual por defecto)
    cargarDatosAsistencia(selectorPeriodo.value);

    // 3. Escuchar cambios en el filtro (Cuando el usuario cambia entre Semanal, Mensual, Anual)
    selectorPeriodo.addEventListener('change', (evento) => {
        const periodoSeleccionado = evento.target.value;
        cargarDatosAsistencia(periodoSeleccionado);
    });
});

/**
 * Función principal asíncrona para obtener datos reales del servidor Python
 * @param {string} periodo - Puede ser 'semanal', 'mensual' o 'anual'
 */
async function cargarDatosAsistencia(periodo) {
    const tbody = document.getElementById('tabla-cuerpo');
    // Mostrar estado de carga mientras se espera la respuesta de la red local
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Conectando con la Base de Datos... <i class="fa-solid fa-spinner fa-spin"></i></td></tr>';

    try {
        // =================================================================
        // CONEXIÓN REAL AL BACKEND FASTAPI (PYTHON)
        // Nota: Asegúrate de que la IP sea localhost o la IP de tu servidor
        // =================================================================
        const respuestaHTTP = await fetch(`http://localhost:8000/api/reporte?periodo=${periodo}`);
        
        // Verificar si el servidor respondió con un error (ej. 404, 500)
        if (!respuestaHTTP.ok) {
            throw new Error(`Error del Servidor: Código HTTP ${respuestaHTTP.status}`);
        }

        // Convertir la respuesta del servidor a formato JSON (Array de objetos)
        const datosDelServidor = await respuestaHTTP.json();
        
        // Enviar los datos obtenidos a las funciones de renderizado visual
        renderizarTabla(datosDelServidor);
        actualizarTarjetasResumen(datosDelServidor);

    } catch (error) {
        // Manejo de errores de red (Ej: Servidor Python apagado, cable desconectado)
        console.error("Fallo crítico en la conexión Frontend-Backend:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="color:#b91c1c; text-align:center; font-weight:bold; background-color:#fee2e2; padding: 20px;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:24px; display:block; margin-bottom:10px;"></i>
                    Error de Conexión: No se pudo contactar al servidor PostgreSQL.<br>
                    <span style="font-weight:normal; font-size:14px;">Verifique que main.py esté en ejecución y la red WiFi esté activa.</span>
                </td>
            </tr>`;
        
        // Poner contadores a cero en caso de error
        document.getElementById('total-users').innerText = "0";
        document.getElementById('total-alerts').innerText = "0";
    }
}

/**
 * Recibe el JSON de PostgreSQL y dibuja el código HTML en el DOM
 * aplicando la lógica de negocio (Alertas Rojas)
 * @param {Array} datos - Lista de usuarios con sus estadísticas
 */
function renderizarTabla(datos) {
    const tbody = document.getElementById('tabla-cuerpo');
    tbody.innerHTML = ''; // Limpiar la tabla de cargas anteriores

    // Si la base de datos está vacía, mostrar mensaje amigable
    if (datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#6b7280;">No hay registros de asistencia para este periodo.</td></tr>';
        return;
    }

    // Iterar sobre cada usuario devuelto por la base de datos
    datos.forEach(usuario => {
        const fila = document.createElement('tr');
        let estadoBadge = '';
        let claseFila = '';

        // =========================================================
        // REGLA DE NEGOCIO ESTRICTA Y VISUAL (NIVEL PROFESIONAL):
        // Condición: >= 3 atrasos O >= 1 falta = ALERTA ROJA
        // =========================================================
        if (usuario.faltas >= 1 || usuario.atrasos >= 3) {
            claseFila = 'alerta-critica'; // Esta clase en CSS pone el fondo rojo y borde grueso
            estadoBadge = '<span class="badge danger" title="Requiere revisión administrativa"><i class="fa-solid fa-triangle-exclamation"></i> En Riesgo</span>';
        } else {
            estadoBadge = '<span class="badge ok"><i class="fa-solid fa-check-double"></i> Regular</span>';
        }

        // Aplicar la clase de alerta a la fila si se cumplió la condición
        if (claseFila) {
            fila.classList.add(claseFila);
        }

        // Construir la estructura HTML de las celdas usando Template Literals
        // Se formatea el ID de huella para que tenga 3 dígitos (ej: 001, 002)
        fila.innerHTML = `
            <td>#${usuario.huella_id.toString().padStart(3, '0')}</td>
            <td><strong>${usuario.nombre}</strong></td>
            <td>${usuario.ci || 'Sin Registrar'}</td>
            <td><span style="color:#166534; font-weight:600;">${usuario.asistencias}</span></td>
            <td>${usuario.atrasos}</td>
            <td>${usuario.faltas}</td>
            <td>${estadoBadge}</td>
        `;
        
        // Insertar la fila recién creada dentro de la tabla en el documento
        tbody.appendChild(fila);
    });
}

/**
 * Actualiza los cuadros numéricos superiores en el panel de control
 * @param {Array} datos - Lista de usuarios
 */
function actualizarTarjetasResumen(datos) {
    // El total de usuarios es simplemente el tamaño del array de respuesta
    const totalUsuarios = datos.length;
    
    // Usamos filter() para contar cuántos usuarios cumplen la regla de riesgo
    const totalAlertas = datos.filter(u => u.faltas >= 1 || u.atrasos >= 3).length;

    // Actualizar el DOM
    document.getElementById('total-users').innerText = totalUsuarios;
    document.getElementById('total-alerts').innerText = totalAlertas;
}

/**
 * Función para exportar la tabla actual
 * (Requiere implementación de librería externa como jsPDF para producción)
 */
function exportarPDF() {
    const periodoActivo = document.getElementById('periodo').options[document.getElementById('periodo').selectedIndex].text;
    alert(`Iniciando exportación de reporte ${periodoActivo} en formato PDF...\n\nNota: Para el despliegue final, conectaremos esta acción con el backend de Python para generar un archivo con sellos oficiales de la institución.`);
}
