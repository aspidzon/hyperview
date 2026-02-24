let isArrangementMode = false; // Estado del modo actual

// 1. Calculamos el alto de la celda
function obtenerAltoCelda() {
    const altoPantalla = window.innerHeight;
    const altoHeader = isArrangementMode ? 70 : 0;
    const altoDisponible = altoPantalla - altoHeader;
    return Math.floor(altoDisponible / 12) + 'px';
}

// 2. Inicializamos Gridstack
const grid = GridStack.init({
    column: 12,
    maxRow: 12,
    cellHeight: obtenerAltoCelda(),
    margin: 5,
    animate: true,
    resizable: { handles: 'e, se, s, sw, w, n, nw, ne' }
});

let historyStack = [];
let redoStack = [];
let isNavigatingHistory = false;

function saveHistory() {
    if (isNavigatingHistory) return;
    historyStack.push(grid.save());
    if (historyStack.length > 30) historyStack.shift(); // keep last 30 states
    redoStack = []; // limpiar rehacer cuando hay nueva accion
}

grid.on('change added removed', function (e, items) {
    saveHistory();
});
setTimeout(saveHistory, 100);

function applyMode() {
    const btn = document.getElementById('toggle-mode-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (isArrangementMode) {
        btn.innerHTML = '👁️ Modo View';
        btn.style.backgroundColor = '#ffcc00';
        btn.style.color = 'black';
        undoBtn.style.display = 'inline-block';
        redoBtn.style.display = 'inline-block';
        document.body.classList.add('arrangement-mode');
        document.body.classList.remove('view-mode');
        grid.enable(); // Activa arrastrar y redimensionar
        document.querySelectorAll('.window-title').forEach(el => el.setAttribute('contenteditable', 'true'));
        document.querySelectorAll('.close-btn').forEach(el => el.style.display = 'inline-block');
        document.querySelector('.toolbar').style.borderBottomColor = '#ffcc00';
    } else {
        btn.innerHTML = '⚙️ Modo Arrangement';
        btn.style.backgroundColor = '';
        btn.style.color = '';
        undoBtn.style.display = 'none';
        redoBtn.style.display = 'none';
        document.body.classList.add('view-mode');
        document.body.classList.remove('arrangement-mode');
        grid.disable(); // Desactiva arrastrar y redimensionar
        document.querySelectorAll('.window-title').forEach(el => el.setAttribute('contenteditable', 'false'));
        document.querySelectorAll('.close-btn').forEach(el => el.style.display = 'none');
        document.querySelector('.toolbar').style.borderBottomColor = '#333';
    }
    if (grid) grid.cellHeight(obtenerAltoCelda());
}

applyMode(); // Aplicar estado inicial

window.addEventListener('resize', () => {
    grid.cellHeight(obtenerAltoCelda());
});

// 3. Agregar ventana inteligente con su HTML interno
function crearVentana(urlInicial = null, isLocalFile = false, fileObj = null) {
    try {
        const nodos = grid.engine.nodes;
        const cantidadActual = nodos.length;

        if (cantidadActual >= 16) {
            alert("Llegaste al límite de pantallas para una sola vista (16 máximo).");
            return;
        }

        const nuevaCantidad = cantidadActual + 1;
        let columnas, filas;

        if (nuevaCantidad === 1) { columnas = 1; filas = 1; }
        else if (nuevaCantidad === 2) { columnas = 2; filas = 1; }
        else if (nuevaCantidad <= 4) { columnas = 2; filas = 2; }
        else if (nuevaCantidad <= 6) { columnas = 3; filas = 2; }
        else if (nuevaCantidad <= 9) { columnas = 3; filas = 3; }
        else if (nuevaCantidad <= 12) { columnas = 4; filas = 3; }
        else { columnas = 4; filas = 4; }

        const w = Math.floor(12 / columnas);
        const h = Math.floor(12 / filas);

        grid.batchUpdate();

        nodos.forEach((nodo, index) => {
            const x = (index % columnas) * w;
            const y = Math.floor(index / columnas) * h;
            grid.update(nodo.el, { x: x, y: y, w: w, h: h });
        });

        const indexNuevo = nuevaCantidad - 1;
        const xNuevo = (indexNuevo % columnas) * w;
        const yNuevo = Math.floor(indexNuevo / columnas) * h;

        // El diseño de la ventana con el botón "X"
        const contentEditable = isArrangementMode ? 'true' : 'false';
        const displayClose = isArrangementMode ? 'inline-block' : 'none';

        let bodyContent = `
            <div style="display: flex; align-items: stretch; justify-content: center; width: 80%; margin-bottom: 10px;">
                <input type="text" class="url-input" style="width: 50%; margin-bottom: 0;" placeholder="Pegar URL de YouTube, Twitch, etc...">
                <button class="load-source-btn" style="white-space: nowrap; margin-bottom: 0;">Cargar Fuente</button>
            </div>
            <div style="margin-top: 15px; font-size: 14px; color:#aaa; margin-bottom: 10px;">O archivo local:</div>
            <label class="local-file-button" style="display: inline-block;">
                <input type="file" class="local-file-input" accept="video/*,audio/*,image/*,.pdf,text/*" style="display: none;">
                <span class="load-source-btn" style="padding: 10px 15px; display: inline-block; border-radius: 5px; cursor: pointer;">Seleccionar Archivo</span>
            </label>
        `;

        if (urlInicial) {
            const urlFinal = adaptarURL(urlInicial);
            bodyContent = `<iframe class="source-iframe" src="${urlFinal}" allow="autoplay; fullscreen" scrolling="no" style="overflow:hidden;"></iframe>`;
        } else if (isLocalFile && fileObj) {
            const urlFinal = URL.createObjectURL(fileObj);
            bodyContent = `<iframe class="source-iframe" src="${urlFinal}" allow="autoplay; fullscreen" scrolling="no" style="overflow:hidden;"></iframe>`;
        }

        // Ensure the new window has an ID for selection purposes
        const newId = `win-${Date.now()}`;

        const contenidoHTML = `
            <div class="window-header">
                <span class="window-title grid-stack-non-drag" contenteditable="${contentEditable}">VENTANA ${nuevaCantidad}</span>
                <button class="close-btn" title="Cerrar ventana" style="display: ${displayClose};">✖</button>
            </div>
            <div class="window-body">
                ${bodyContent}
            </div>
        `;

        grid.addWidget({
            x: xNuevo,
            y: yNuevo,
            w: w,
            h: h,
            content: contenidoHTML,
            id: newId
        });

        // Set the custom attribute so we can find it easily later
        setTimeout(() => {
            const addedWidget = grid.engine.nodes.find(n => n.id === newId);
            if (addedWidget && addedWidget.el) {
                addedWidget.el.setAttribute('gs-id', newId);
            }
        }, 50);

        grid.commit();

    } catch (error) {
        console.error("Error en Hyperview:", error);
    }
}

document.getElementById('add-btn').addEventListener('click', () => crearVentana());

// 4. Traductor inteligente de URLs (YouTube y Twitch)
function adaptarURL(urlOriginal) {
    let url = urlOriginal.trim();

    // Le agregamos https:// si el usuario se olvidó, para evitar errores
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    try {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            let videoId = '';
            if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split('?')[0];
            } else {
                const urlObj = new URL(url);
                videoId = urlObj.searchParams.get('v');
            }
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
            }
        }

        if (url.includes('twitch.tv/')) {
            const canal = url.split('twitch.tv/')[1].split('?')[0];
            return `https://player.twitch.tv/?channel=${canal}&parent=localhost`;
        }
    } catch (e) {
        console.error("Error adaptando la URL", e);
    }

    return url;
}

// 5. Detectar clics en "Cargar" o en la "X"
document.addEventListener('click', (e) => {
    // Si toca cargar
    if (e.target.classList.contains('load-source-btn')) {
        // Ignoramos si el clic fue en el botón de archivo local (que ahora usa la misma clase visual)
        if (e.target.closest('.local-file-button')) {
            return;
        }

        const windowBody = e.target.closest('.window-body');
        const input = windowBody.querySelector('.url-input');
        const urlOriginal = input.value.trim();

        if (urlOriginal === "") return alert("Por favor, pegá un enlace primero.");

        const urlFinal = adaptarURL(urlOriginal);
        // Inyectamos el iframe
        windowBody.innerHTML = `<iframe class="source-iframe" src="${urlFinal}" allow="autoplay; fullscreen" scrolling="no" style="overflow:hidden;"></iframe>`;
    }

    // Si toca la X de cerrar
    if (e.target.classList.contains('close-btn')) {
        const widget = e.target.closest('.grid-stack-item');
        grid.removeWidget(widget);
    }
});

// Detectar tecla Enter en input de URL
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('url-input')) {
        const windowBody = e.target.closest('.window-body');
        if (!windowBody) return;
        const loadBtn = windowBody.querySelector('.load-source-btn');
        if (loadBtn) loadBtn.click();
    }
});

// Detectar selección de archivo local en ventana vacía
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('local-file-input')) {
        const file = e.target.files[0];
        if (!file) return;
        const urlFinal = URL.createObjectURL(file);
        const windowBody = e.target.closest('.window-body');
        windowBody.innerHTML = `<iframe class="source-iframe" src="${urlFinal}" allow="autoplay; fullscreen" scrolling="no" style="overflow:hidden;"></iframe>`;
    }
});

// 6. Botones de Control General (Limpiar, Guardar, Cargar)
document.getElementById('clear-btn').addEventListener('click', () => {
    grid.removeAll();
});

document.getElementById('save-btn').addEventListener('click', () => {
    const layout = grid.save();
    const layoutJSON = JSON.stringify(layout);

    const blob = new Blob([layoutJSON], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = "mi_layout.hyprv";
    a.click();
    URL.revokeObjectURL(url);
});

const loadInput = document.getElementById('load-input');
document.getElementById('load-btn').addEventListener('click', () => loadInput.click());

loadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const contenido = e.target.result;
        try {
            const layout = JSON.parse(contenido);
            grid.removeAll();
            grid.load(layout);
            applyMode();
        } catch (error) {
            alert("El archivo .hyprv parece estar corrupto.");
        }
    };
    reader.readAsText(file);
    loadInput.value = '';
});

// 7. Toggle Modo View / Arrangement
document.getElementById('toggle-mode-btn').addEventListener('click', (e) => {
    isArrangementMode = !isArrangementMode;
    applyMode();
});

// 8. Deshacer Cambios (Undo)
document.getElementById('undo-btn').addEventListener('click', () => {
    if (historyStack.length > 1) {
        const currentState = historyStack.pop(); // Sacar el estado actual
        redoStack.push(currentState);
        const prevState = historyStack[historyStack.length - 1]; // Tomar el anterior
        isNavigatingHistory = true;
        grid.removeAll();
        grid.load(prevState);
        applyMode();
        isNavigatingHistory = false;
    }
});

// 8.5 Rehacer Cambios (Redo)
document.getElementById('redo-btn').addEventListener('click', () => {
    if (redoStack.length > 0) {
        const restoredState = redoStack.pop();
        historyStack.push(restoredState);
        isNavigatingHistory = true;
        grid.removeAll();
        grid.load(restoredState);
        applyMode();
        isNavigatingHistory = false;
    }
});

// 9. Modal para añadir ventana con fuente pre-cargada
const addSourceModal = document.getElementById('add-source-modal');
document.getElementById('add-source-modal-btn').addEventListener('click', () => {
    addSourceModal.style.display = 'flex';
});

document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    addSourceModal.style.display = 'none';
    document.getElementById('modal-url-input').value = '';
    document.getElementById('modal-file-input').value = '';
});

document.getElementById('modal-add-btn').addEventListener('click', () => {
    const urlVal = document.getElementById('modal-url-input').value.trim();
    const fileInput = document.getElementById('modal-file-input');

    if (fileInput.files && fileInput.files[0]) {
        crearVentana(null, true, fileInput.files[0]);
    } else if (urlVal !== "") {
        crearVentana(urlVal);
    } else {
        alert("Por favor inserta una URL o selecciona un archivo.");
        return;
    }

    addSourceModal.style.display = 'none';
    document.getElementById('modal-url-input').value = '';
    fileInput.value = '';
});

// --- Keyboard Shortcuts & Window Selection ---
let selectedWindowId = null;

function clearWindowSelection() {
    document.querySelectorAll('.grid-stack-item').forEach(el => {
        el.style.border = '';
    });
    selectedWindowId = null;
}

function selectWindow(direction) {
    const nodes = grid.engine.nodes;
    if (nodes.length === 0) return;

    if (selectedWindowId === null) {
        selectedWindowId = nodes[0].el.getAttribute('gs-id');
        if (!selectedWindowId) {
            nodes.forEach((n, i) => n.el.setAttribute('gs-id', `win-${i}`));
            selectedWindowId = nodes[0].el.getAttribute('gs-id');
        }
    } else {
        const currentIndex = nodes.findIndex(n => n.el.getAttribute('gs-id') === selectedWindowId);
        let nextIndex = currentIndex;

        if (direction === 'next' || direction === 'right' || direction === 'down') {
            nextIndex = (currentIndex + 1) % nodes.length;
        } else if (direction === 'prev' || direction === 'left' || direction === 'up') {
            nextIndex = (currentIndex - 1 + nodes.length) % nodes.length;
        }
        selectedWindowId = nodes[nextIndex].el.getAttribute('gs-id');
    }

    document.querySelectorAll('.grid-stack-item').forEach(el => {
        if (el.getAttribute('gs-id') === selectedWindowId) {
            el.style.border = '2px solid #00ffcc';
            el.style.borderRadius = '8px';
            el.style.zIndex = 100;
        } else {
            el.style.border = '';
            el.style.zIndex = '';
        }
    });
}

function getSelectedWidget() {
    if (!selectedWindowId) return null;
    return document.querySelector(`.grid-stack-item[gs-id="${selectedWindowId}"]`);
}

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
    }

    const key = e.key.toLowerCase();

    if (e.ctrlKey || e.metaKey) {
        if (isArrangementMode) {
            if (key === 'z') {
                e.preventDefault();
                document.getElementById('undo-btn').click();
            } else if (key === 'y') {
                e.preventDefault();
                document.getElementById('redo-btn').click();
            }
        }
        return;
    }

    if (document.getElementById('add-source-modal').style.display === 'flex') {
        if (key === 'escape') {
            document.getElementById('modal-cancel-btn').click();
        }
        return;
    }

    switch (key) {
        case 'n':
            crearVentana();
            break;
        case 'x':
            const widgetToRemove = getSelectedWidget();
            if (widgetToRemove) {
                grid.removeWidget(widgetToRemove);
                clearWindowSelection();
            }
            break;
        case 'd':
            const widgetToDuplicate = getSelectedWidget();
            if (widgetToDuplicate) {
                const iframe = widgetToDuplicate.querySelector('.source-iframe');
                if (iframe) {
                    crearVentana(iframe.src);
                } else {
                    crearVentana();
                }
            }
            break;
        case 's':
            document.getElementById('save-btn').click();
            break;
        case 'o':
            document.getElementById('load-btn').click();
            break;
        case 'r':
            grid.removeAll();
            clearWindowSelection();
            break;
        case 'a':
            if (!isArrangementMode) document.getElementById('toggle-mode-btn').click();
            break;
        case 'v':
            if (isArrangementMode) document.getElementById('toggle-mode-btn').click();
            break;
        case 'i':
            document.getElementById('add-source-modal-btn').click();
            break;
        case 'arrowright':
            selectWindow('right');
            break;
        case 'arrowleft':
            selectWindow('left');
            break;
        case 'arrowup':
            selectWindow('up');
            break;
        case 'arrowdown':
            selectWindow('down');
            break;
        case 'escape':
            clearWindowSelection();
            break;
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.grid-stack-item') && !e.target.closest('.toolbar')) {
        clearWindowSelection();
    } else if (e.target.classList.contains('window-title') || e.target.classList.contains('window-header')) {
        const widget = e.target.closest('.grid-stack-item');
        if (widget) {
            const id = widget.getAttribute('gs-id');
            if (id) {
                selectedWindowId = id;
                document.querySelectorAll('.grid-stack-item').forEach(el => {
                    if (el.getAttribute('gs-id') === selectedWindowId) {
                        el.style.border = '2px solid #00ffcc';
                        el.style.borderRadius = '8px';
                        el.style.zIndex = 100;
                    } else {
                        el.style.border = '';
                        el.style.zIndex = '';
                    }
                });
            }
        }
    }
});