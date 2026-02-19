// Función para calcular el alto exacto de cada celda en píxeles
function obtenerAltoCelda() {
    const altoPantalla = window.innerHeight;
    const altoHeader = 80; // Lo que mide tu barra de herramientas
    const altoDisponible = altoPantalla - altoHeader;
    return Math.floor(altoDisponible / 12) + 'px'; 
}

// 1. Inicializamos el Arrangement Mode
const grid = GridStack.init({
    column: 12,
    maxRow: 12, // Límite en Y para que no haya scroll
    cellHeight: obtenerAltoCelda(), // Llamamos a la función matemática
    margin: 5,
    animate: true,
    resizable: { handles: 'e, se, s, sw, w, n, nw, ne' } 
});

// Si el usuario cambia el tamaño de la ventana, recalculamos el alto
window.addEventListener('resize', () => {
    grid.cellHeight(obtenerAltoCelda());
});

// 2. Agregar ventana con inteligencia
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
        
        // Lógica de divisiones
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

        grid.addWidget({ 
            x: xNuevo, 
            y: yNuevo, 
            w: w, 
            h: h, 
            content: `Ventana ${nuevaCantidad}` 
        });

        grid.commit(); 

    } catch (error) {
        console.error("Error en Hyperview:", error);
    }
});

// 3. Limpiar toda la grilla
document.getElementById('clear-btn').addEventListener('click', () => {
    grid.removeAll();
});

// 4. Guardar Perfil (.hyprv)
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

// 5. Cargar Perfil (.hyprv)
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