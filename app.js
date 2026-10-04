import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://njkfcobdsgqqzgwjlwqi.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_Gxha0ugJOSv954EFW6J3DA_23zhY0Uz';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos del DOM
const uploadForm = document.getElementById('uploadForm');
const categoriaSelect = document.getElementById('categoriaSelect');
const galeriaGrid = document.getElementById('galeriaGrid');

// 1. Cargar las categorías al abrir la página
async function cargarCategorias() {
    const { data, error } = await supabase.from('categorias').select('*');
    
    if (error) {
        console.error('Error al cargar categorías:', error.message);
        return;
    }

    categoriaSelect.innerHTML = '<option value="">Selecciona una categoría</option>';
    data.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.nombre;
        categoriaSelect.appendChild(option);
    });
}

// 2. Cargar las fotos de la base de datos y mostrarlas en la galería
async function cargarFotos() {
    const { data, error } = await supabase
        .from('fotos')
        .select(`
            id,
            url_imagen,
            descripcion,
            fecha_subida,
            categorias (nombre)
        `)
        .order('id', { ascending: false });

    if (error) {
        console.error('Error al cargar fotos:', error.message);
        return;
    }

    galeriaGrid.innerHTML = '';
    
    if (data.length === 0) {
        galeriaGrid.innerHTML = '<p>Aún no hay fotos en el álbum. ¡Sube la primera!</p>';
        return;
    }

    data.forEach(foto => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        
        // Limpiamos las comillas simples de la descripción para evitar errores en el HTML generado
        const descSegura = (foto.descripcion || '').replace(/'/g, "\\'");

        card.innerHTML = `
            <img src="${foto.url_imagen}" alt="Recuerdo">
            <div class="photo-card-content">
                <span>${foto.categorias ? foto.categorias.nombre : 'General'}</span>
                <p>${foto.descripcion || 'Sin descripción'}</p>
                <div class="card-actions" style="margin-top: 12px; display: flex; gap: 8px;">
                    <button onclick="window.editarFoto(${foto.id}, '${descSegura}')" style="background: #0B2233; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Editar</button>
                    <button onclick="window.eliminarFoto(${foto.id}, '${foto.url_imagen}')" style="background: #BF1111; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Eliminar</button>
                </div>
            </div>
        `;
        galeriaGrid.appendChild(card);
    });
}

// 3. Funciones Globales para Editar y Eliminar
window.editarFoto = async (id, descripcionActual) => {
    const nuevaDescripcion = prompt('Edita la descripción de tu recuerdo:', descripcionActual);
    if (nuevaDescripcion === null) return; // Si el usuario cancela, no hacemos nada

    try {
        const { error } = await supabase
            .from('fotos')
            .update({ descripcion: nuevaDescripcion })
            .eq('id', id);

        if (error) throw error;

        alert('¡Recuerdo actualizado con éxito! ✨');
        cargarFotos();
    } catch (err) {
        console.error('Error al actualizar:', err.message);
        alert('Hubo un error al actualizar la descripción.');
    }
};

window.eliminarFoto = async (id, urlImagen) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este recuerdo para siempre?')) return;

    try {
        // A. Extraer la ruta del archivo dentro del bucket para borrarlo del Storage
        const rutaArchivo = urlImagen.split('/galeria/')[1];
        if (rutaArchivo) {
            await supabase.storage.from('galeria').remove([rutaArchivo]);
        }

        // B. Borrar el registro de la tabla 'fotos'
        const { error } = await supabase
            .from('fotos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Recuerdo eliminado con éxito.');
        cargarFotos();
    } catch (err) {
        console.error('Error al eliminar:', err.message);
        alert('Hubo un error al eliminar la foto.');
    }
};

// 4. Manejar la subida de una nueva foto
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('fotoInput');
    const descripcion = document.getElementById('descripcionInput').value;
    const categoriaId = categoriaSelect.value;
    const file = fileInput.files[0];

    if (!file) return alert('Selecciona una imagen.');

    const btnSubir = document.getElementById('btnSubir');
    btnSubir.textContent = 'Subiendo...';
    btnSubir.disabled = true;

    try {
        // A. Subir imagen al Bucket 'galeria'
        const nombreArchivo = `${Date.now()}_${file.name}`;
        const { data: storageData, error: storageError } = await supabase.storage
            .from('galeria')
            .upload(nombreArchivo, file);

        if (storageError) throw storageError;

        // B. Obtener la URL pública de la imagen
        const { data: publicUrlData } = supabase.storage
            .from('galeria')
            .getPublicUrl(nombreArchivo);

        const imageUrl = publicUrlData.publicUrl;

        // C. Guardar el registro en la tabla 'fotos'
        const { error: dbError } = await supabase
            .from('fotos')
            .insert([
                { 
                    url_imagen: imageUrl, 
                    descripcion: descripcion, 
                    categoria_id: parseInt(categoriaId) 
                }
            ]);

        if (dbError) throw dbError;

        alert('¡Recuerdo guardado con éxito! ❤️');
        uploadForm.reset();
        cargarFotos(); // Recargar la galería

    } catch (error) {
        console.error('Error en el proceso:', error.message);
        alert('Hubo un error al subir la foto.');
    } finally {
        btnSubir.textContent = 'Guardar Recuerdo';
        btnSubir.disabled = false;
    }
});

// Inicializar funciones al cargar la página
cargarCategorias();
cargarFotos();


// --- LLUVIA DE CORAZONES ---
function iniciarLluviaDeCorazones() {
    const container = document.createElement('div');
    container.className = 'heart-rain';
    document.body.appendChild(container);

    // Generar un corazón nuevo cada cierto tiempo (400 milisegundos)
    setInterval(() => {
        const heart = document.createElement('div');
        heart.className = 'falling-heart';
        heart.innerHTML = '♥'; // Usamos el símbolo para que respete el color #BF1111
        
        // Posición horizontal aleatoria en la pantalla (de 0% a 100%)
        heart.style.left = Math.random() * 100 + 'vw';
        
        // Duración de la caída lenta (entre 7 y 14 segundos para que bajen suavemente)
        const duration = Math.random() * 7 + 7;
        heart.style.animationDuration = duration + 's';
        
        // Tamaño aleatorio pequeño (entre 12px y 22px)
        const size = Math.random() * 10 + 12;
        heart.style.fontSize = size + 'px';
        
        container.appendChild(heart);

        // Limpiar el elemento del DOM cuando termine la animación para optimizar rendimiento
        setTimeout(() => {
            heart.remove();
        }, duration * 1000);
    }, 400);
}

// Activar la lluvia de corazones al cargar la página
iniciarLluviaDeCorazones();