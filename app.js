// 1. Calculamos el alto de la celda
function obtenerAltoCelda() {
    const altoPantalla = window.innerHeight;
    const altoHeader = 80; 
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

window.addEventListener('resize', () => {
    grid.cellHeight(obtenerAltoCelda());
});

// 3. Agregar ventana inteligente con su HTML interno
document.getElementById('add-btn').addEventListener('click', () => {
    try {
        const nodos = grid.engine.nodes; 
        const cantidadActual = nodos.length;
        
        if (cantidadActual >= 12) {
            alert("Llegaste al límite de pantallas para una sola vista (12 máximo).");
            return;
        }

        const nuevaCantidad = cantidadActual + 1;
        let columnas, filas;
        
        if (nuevaCantidad === 1) { columnas = 1; filas = 1; }
        else if (nuevaCantidad === 2) { columnas = 2; filas = 1; }
        else if (nuevaCantidad <= 4) { columnas = 2; filas = 2; }
        else if (nuevaCantidad <= 6) { columnas = 3; filas = 2; }
        else if (nuevaCantidad <= 9) { columnas = 3; filas = 3; }
        else { columnas = 4; filas = 3; } 

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
        const contenidoHTML = `
            <div class="window-header">
                <span class="window-title">Ventana ${nuevaCantidad}</span>
                <button class="close-btn" title="Cerrar ventana">✖</button>
            </div>
            <div class="window-body">
                <input type="text" class="url-input" placeholder="Pegar URL de YouTube, Twitch, etc...">
                <button class="load-source-btn">Cargar Fuente</button>
            </div>
        `;

        grid.addWidget({ 
            x: xNuevo, 
            y: yNuevo, 
            w: w, 
            h: h, 
            content: contenidoHTML 
        });

        grid.commit(); 

    } catch (error) {
        console.error("Error en Hyperview:", error);
    }
});

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
        const windowBody = e.target.closest('.window-body');
        const input = windowBody.querySelector('.url-input');
        const urlOriginal = input.value.trim();

        if (urlOriginal === "") return alert("Por favor, pegá un enlace primero.");

        const urlFinal = adaptarURL(urlOriginal);
        // Inyectamos el iframe
        windowBody.innerHTML = `<iframe class="source-iframe" src="${urlFinal}" allow="autoplay; fullscreen"></iframe>`;
    }

    // Si toca la X de cerrar
    if (e.target.classList.contains('close-btn')) {
        const widget = e.target.closest('.grid-stack-item');
        grid.removeWidget(widget);
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
        } catch (error) {
            alert("El archivo .hyprv parece estar corrupto.");
        }
    };
    reader.readAsText(file);
    loadInput.value = ''; 
});