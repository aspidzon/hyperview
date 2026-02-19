// 1. Inicializamos el Arrangement Mode (Grilla de 12 columnas)
const grid = GridStack.init({
    column: 12,
    cellHeight: '100px',
    margin: 10,
    animate: true
});

// 2. Función para agregar una ventana de prueba
document.getElementById('add-btn').addEventListener('click', () => {
    // Agrega un bloque que ocupa 4 columnas y 3 filas
    grid.addWidget({w: 4, h: 3, content: 'Nueva Ventana (Próximamente fuentes web)'});
});

// 3. Limpiar toda la grilla
document.getElementById('clear-btn').addEventListener('click', () => {
    grid.removeAll();
});

// 4. Mágia: Guardar la configuración como archivo .hyprv
document.getElementById('save-btn').addEventListener('click', () => {
    // Obtenemos las posiciones y tamaños de todas las ventanas
    const layout = grid.save(); 
    const layoutJSON = JSON.stringify(layout);
    
    // Creamos el archivo virtual
    const blob = new Blob([layoutJSON], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    
    // Forzamos la descarga con nuestra extensión
    const a = document.createElement('a');
    a.href = url;
    a.download = "mi_layout.hyprv";
    a.click();
    URL.revokeObjectURL(url);
});

// 5. Mágia: Cargar un archivo .hyprv
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
            grid.load(layout); // Cargamos las posiciones guardadas
        } catch (error) {
            alert("El archivo .hyprv parece estar corrupto.");
        }
    };
    reader.readAsText(file);
    // Reseteamos el input para poder cargar el mismo archivo dos veces seguidas si queremos
    loadInput.value = ''; 
});