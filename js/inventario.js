// ============================================================
//  inventario.js — Dashboard de gestión de inventario
// ============================================================

// ── Estado ───────────────────────────────────────────────────
let _zapatos = []; // lista maestra del servidor
let _filtrados = []; // lista con filtros aplicados
let _paginaActual = 1;
const POR_PAGINA = 10;

// ── Init Dashboard ───────────────────────────────────────────
async function initDashboard() {
    requiereAuth();

    const sesion = obtenerSesion();

    // Nombre de usuario en sidebar
    const nombre = sesion ?.usuario ?? sesion ?.username ?? 'Usuario';
    const initial = nombre.charAt(0).toUpperCase();
    document.getElementById('user-name-display').textContent = nombre;
    document.getElementById('user-avatar').textContent = initial;
    document.querySelectorAll('.user-name').forEach(el => el.textContent = nombre);

    // Botón logout
    document.getElementById('btn-logout').addEventListener('click', cerrarSesion);

    // Búsqueda en topbar
    document.getElementById('topbar-search').addEventListener('input', (e) => {
        aplicarFiltros();
    });

    // Filtros de género / categoría
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const group = chip.dataset.group;
            document.querySelectorAll(`.filter-chip[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            aplicarFiltros();
        });
    });

    // Botón agregar
    document.getElementById('btn-agregar').addEventListener('click', () => abrirModalCrear());

    // Cargar inventario
    await cargarInventario();
}

// ── Cargar inventario ─────────────────────────────────────────
async function cargarInventario() {
    const tbody = document.getElementById('tabla-body');
    tbody.innerHTML = `<tr><td colspan="9"><div class="spinner"></div></td></tr>`;

    try {
        _zapatos = await apiGetZapatos();
        aplicarFiltros();
        actualizarStats();
    } catch (err) {
        tbody.innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state">
          <i class="bi bi-wifi-off"></i>
          <h5>Error de conexión</h5>
          <p>No se pudo conectar con el servidor en localhost:8081</p>
        </div>
      </td></tr>`;
        console.error(err);
    }
}

// ── Filtros ───────────────────────────────────────────────────
function aplicarFiltros() {
    const busqueda = document.getElementById('topbar-search').value.toLowerCase().trim();
    const generoActivo = document.querySelector('.filter-chip[data-group="genero"].active') ?.dataset.value ?? 'TODOS';
    const categoriaActiva = document.querySelector('.filter-chip[data-group="categoria"].active') ?.dataset.value ?? 'TODOS';

    _filtrados = _zapatos.filter(z => {
        const matchBusqueda = !busqueda ||
            z.marca ?.toLowerCase().includes(busqueda) ||
            z.modelo ?.toLowerCase().includes(busqueda) ||
            z.sku ?.toLowerCase().includes(busqueda) ||
            z.color ?.toLowerCase().includes(busqueda);

        const matchGenero = generoActivo === 'TODOS' || z.genero === generoActivo;
        const matchCategoria = categoriaActiva === 'TODOS' || z.categoria === categoriaActiva;

        return matchBusqueda && matchGenero && matchCategoria;
    });

    _paginaActual = 1;
    renderizarTabla();
    renderizarPaginacion();
}

// ── Renderizar tabla ──────────────────────────────────────────
function renderizarTabla() {
    const tbody = document.getElementById('tabla-body');
    const inicio = (_paginaActual - 1) * POR_PAGINA;
    const pagina = _filtrados.slice(inicio, inicio + POR_PAGINA);

    if (_filtrados.length === 0) {
        tbody.innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state">
          <i class="bi bi-inbox"></i>
          <h5>Sin resultados</h5>
          <p>No se encontraron zapatos con los filtros aplicados.</p>
        </div>
      </td></tr>`;
        return;
    }

    tbody.innerHTML = pagina.map((z, i) => {
        const stockClass = z.stock === 0 ? 'stock-zero' : z.stock <= 5 ? 'stock-low' : 'stock-ok';
        const stockIcon = z.stock === 0 ? 'bi-x-circle' : z.stock <= 5 ? 'bi-exclamation-triangle' : 'bi-check-circle';
        const generoClass = { MASCULINO: 'genero-M', FEMENINO: 'genero-F', UNISEX: 'genero-U' }[z.genero] ?? '';
        const generoLabel = { MASCULINO: 'M', FEMENINO: 'F', UNISEX: 'U' }[z.genero] ?? z.genero;
        const precioFmt = z.precio != null ?
            `$${Number(z.precio).toLocaleString('es-CO')}` :
            '—';

        return `
    <tr>
      <td>
        <div class="marca-badge">${z.marca ?? '—'}</div>
        <div class="model-text">${z.modelo ?? ''}</div>
      </td>
      <td>
        <div class="color-dot">
          <span class="color-swatch" style="background:${colorCSS(z.color)}"></span>
          ${z.color ?? '—'}
        </div>
      </td>
      <td>${z.talla ?? '—'}</td>
      <td><span class="genero-badge ${generoClass}">${generoLabel}</span></td>
      <td><span class="text-soft" style="font-size:12px">${formatCategoria(z.categoria)}</span></td>
      <td class="precio-text">${precioFmt}</td>
      <td>
        <span class="stock-badge ${stockClass}">
          <i class="bi ${stockIcon}"></i> ${z.stock ?? 0}
        </span>
      </td>
      <td style="color:var(--text-muted);font-size:12px">${z.sku ?? '—'}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-outline btn-sm" title="Subir stock" onclick="abrirModalStock('${encodeURIComponent(JSON.stringify(z))}')">
            <i class="bi bi-arrow-up-circle"></i>
          </button>
          <button class="btn btn-outline btn-sm" title="Editar" onclick="abrirModalEditar('${encodeURIComponent(JSON.stringify(z))}')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-danger btn-sm" title="Eliminar" onclick="confirmarEliminar('${z.sku}', '${z.marca} ${z.modelo}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
    }).join('');
}

// ── Paginación ────────────────────────────────────────────────
function renderizarPaginacion() {
    const totalPags = Math.ceil(_filtrados.length / POR_PAGINA);
    const info = document.getElementById('pag-info');
    const btns = document.getElementById('pag-btns');

    const inicio = _filtrados.length === 0 ? 0 : (_paginaActual - 1) * POR_PAGINA + 1;
    const fin = Math.min(_paginaActual * POR_PAGINA, _filtrados.length);
    info.textContent = `Mostrando ${inicio}–${fin} de ${_filtrados.length} resultados`;

    let html = `
    <button class="pag-btn" ${_paginaActual === 1 ? 'disabled' : ''}
      onclick="cambiarPagina(${_paginaActual - 1})">
      <i class="bi bi-chevron-left"></i>
    </button>`;

    for (let p = 1; p <= totalPags; p++) {
        if (totalPags > 7 && p > 2 && p < totalPags - 1 && Math.abs(p - _paginaActual) > 1) {
            if (p === 3 || p === totalPags - 2) html += `<span class="pag-btn" style="cursor:default">…</span>`;
            continue;
        }
        html += `<button class="pag-btn ${p === _paginaActual ? 'active' : ''}" onclick="cambiarPagina(${p})">${p}</button>`;
    }

    html += `
    <button class="pag-btn" ${_paginaActual === totalPags || totalPags === 0 ? 'disabled' : ''}
      onclick="cambiarPagina(${_paginaActual + 1})">
      <i class="bi bi-chevron-right"></i>
    </button>`;

    btns.innerHTML = html;
}

function cambiarPagina(n) {
    _paginaActual = n;
    renderizarTabla();
    renderizarPaginacion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Stats ─────────────────────────────────────────────────────
function actualizarStats() {
    const total = _zapatos.length;
    const sinStock = _zapatos.filter(z => z.stock === 0).length;
    const stockBajo = _zapatos.filter(z => z.stock > 0 && z.stock <= 5).length;
    const valorTotal = _zapatos.reduce((s, z) => s + (Number(z.precio ?? 0) * (z.stock ?? 0)), 0);

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-sinstock').textContent = sinStock;
    document.getElementById('stat-bajo').textContent = stockBajo;
    document.getElementById('stat-valor').textContent = `$${Math.round(valorTotal / 1000)}K`;
}

// ── Modal CREAR ───────────────────────────────────────────────
function abrirModalCrear() {
    const modal = crearModal(`
    <div class="modal-header">
      <h5><i class="bi bi-plus-circle me-2" style="color:var(--accent)"></i>Agregar Zapato</h5>
      <button class="btn-close-modal" onclick="cerrarModal()">✕</button>
    </div>
    <div class="modal-body">
      ${formZapato()}
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-guardar-zapato" onclick="guardarZapato()">
        <i class="bi bi-check2"></i> Guardar
      </button>
    </div>
  `);
    document.body.appendChild(modal);
}

async function guardarZapato() {
    const data = leerFormZapato();
    if (!data) return;

    const btn = document.getElementById('btn-guardar-zapato');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const res = await apiCrearZapato(data);
        if (res.ok || res.status === 201) {
            showToast('Zapato agregado correctamente', 'success');
            cerrarModal();
            await cargarInventario();
        } else {
            const msg = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            showToast(msg || 'Error al guardar', 'error');
        }
    } catch (err) {
        showToast('Error de conexión', 'error');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2"></i> Guardar';
    }
}

// ── Modal EDITAR ──────────────────────────────────────────────
function abrirModalEditar(encoded) {
    const zapato = JSON.parse(decodeURIComponent(encoded));

    const modal = crearModal(`
    <div class="modal-header">
      <h5><i class="bi bi-pencil me-2" style="color:var(--info)"></i>Editar Zapato</h5>
      <button class="btn-close-modal" onclick="cerrarModal()">✕</button>
    </div>
    <div class="modal-body">
      ${formZapato(zapato)}
      <p class="sku-hint" style="margin-top:8px">
        <i class="bi bi-info-circle"></i>
        El SKU identifica el zapato. Cámbialo solo si es necesario.
      </p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-editar-zapato"
        onclick="actualizarZapato('${zapato.sku}')">
        <i class="bi bi-check2"></i> Actualizar
      </button>
    </div>
  `);
    document.body.appendChild(modal);
}

async function actualizarZapato(skuOriginal) {
    const data = leerFormZapato();
    if (!data) return;

    const btn = document.getElementById('btn-editar-zapato');
    btn.disabled = true;
    btn.textContent = 'Actualizando...';

    try {
        const res = await apiEditarZapato(skuOriginal, data);
        if (res.ok) {
            showToast('Zapato actualizado', 'success');
            cerrarModal();
            await cargarInventario();
        } else {
            showToast('Error al actualizar (endpoint pendiente)', 'warning');
        }
    } catch {
        showToast('Error de conexión', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2"></i> Actualizar';
    }
}

// ── Modal STOCK ───────────────────────────────────────────────
function abrirModalStock(encoded) {
    const zapato = JSON.parse(decodeURIComponent(encoded));

    const modal = crearModal(`
    <div class="modal-header">
      <h5><i class="bi bi-arrow-up-circle me-2" style="color:var(--success)"></i>Ajustar Stock</h5>
      <button class="btn-close-modal" onclick="cerrarModal()">✕</button>
    </div>
    <div class="modal-body">
      <p style="color:var(--text-soft);margin-bottom:20px">
        <strong style="color:var(--text)">${zapato.marca} ${zapato.modelo}</strong>
        — Stock actual: <span class="stock-badge ${zapato.stock <= 5 ? 'stock-low' : 'stock-ok'}">${zapato.stock}</span>
      </p>
      <div class="form-group">
        <label class="form-label">Cantidad a agregar</label>
        <input type="number" id="stock-cantidad" class="form-control"
          placeholder="Ej: 10" min="1" max="9999">
      </div>
      <div class="form-group">
        <label class="form-label">Operación</label>
        <select id="stock-op" class="form-select">
          <option value="subir">Subir stock (+)</option>
          <option value="bajar">Bajar stock (−)</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
      <button class="btn btn-success" id="btn-stock"
        onclick="aplicarStock('${zapato.sku}', ${zapato.stock})">
        <i class="bi bi-check2"></i> Aplicar
      </button>
    </div>
  `);
    document.body.appendChild(modal);
}

async function aplicarStock(sku, stockActual) {
    const cantidadRaw = parseInt(document.getElementById('stock-cantidad').value);
    const op = document.getElementById('stock-op').value;

    if (!cantidadRaw || cantidadRaw <= 0) {
        showToast('Ingresa una cantidad válida', 'warning');
        return;
    }

    const delta = op === 'subir' ? cantidadRaw : -cantidadRaw;

    if (stockActual + delta < 0) {
        showToast('El stock no puede quedar negativo', 'warning');
        return;
    }

    const btn = document.getElementById('btn-stock');
    btn.disabled = true;

    try {
        const res = await apiAjustarStock(sku, delta);
        if (res.ok) {
            showToast('Stock actualizado', 'success');
            cerrarModal();
            await cargarInventario();
        } else {
            showToast('Endpoint de stock aún no implementado en el servidor', 'warning');
            cerrarModal();
        }
    } catch {
        showToast('Error de conexión', 'error');
    } finally {
        btn.disabled = false;
    }
}

// ── Confirmar ELIMINAR ────────────────────────────────────────
function confirmarEliminar(sku, nombre) {
    const modal = crearModal(`
    <div class="modal-body confirm-modal" style="text-align:center;padding:36px 24px">
      <div class="confirm-icon"><i class="bi bi-trash3"></i></div>
      <h5 style="margin-bottom:8px">Eliminar producto</h5>
      <p style="color:var(--text-muted);margin-bottom:24px">
        ¿Estás seguro de eliminar <strong style="color:var(--text)">${nombre}</strong>?
        Esta acción no se puede deshacer.
      </p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
        <button class="btn btn-danger" id="btn-confirmar-eliminar" onclick="ejecutarEliminar('${sku}')">
          <i class="bi bi-trash"></i> Sí, eliminar
        </button>
      </div>
    </div>
  `);
    document.body.appendChild(modal);
}

async function ejecutarEliminar(sku) {
    const btn = document.getElementById('btn-confirmar-eliminar');
    btn.disabled = true;
    btn.textContent = 'Eliminando...';

    try {
        const res = await apiEliminarZapato(sku);
        if (res.ok) {
            showToast('Zapato eliminado', 'success');
            cerrarModal();
            await cargarInventario();
        } else {
            showToast('Endpoint de eliminación aún no disponible en el servidor', 'warning');
            cerrarModal();
        }
    } catch {
        showToast('Error de conexión', 'error');
        cerrarModal();
    }
}

// ── Helpers de Modal ──────────────────────────────────────────
function crearModal(innerHtml) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-overlay';
    overlay.innerHTML = `<div class="modal">${innerHtml}</div>`;

    // Cerrar al click fuera
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cerrarModal();
    });

    return overlay;
}

function cerrarModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
}

// ── Formulario zapato (crear / editar) ───────────────────────
function formZapato(z = {}) {
    const generos = ['MASCULINO', 'FEMENINO', 'UNISEX'];
    const categorias = ['DEPORTIVO', 'CASUAL', 'FORMAL', 'BOTA', 'SANDALIA', 'OTRO'];

    const sel = (arr, val) => arr.map(v =>
        `<option value="${v}" ${v === val ? 'selected' : ''}>${formatCategoria(v)}</option>`
    ).join('');

    return `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Marca *</label>
        <input id="f-marca" class="form-control" placeholder="Nike, Adidas…" value="${z.marca ?? ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Modelo *</label>
        <input id="f-modelo" class="form-control" placeholder="Air Max 90…" value="${z.modelo ?? ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Color *</label>
        <input id="f-color" class="form-control" placeholder="Negro, Blanco…" value="${z.color ?? ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Talla *</label>
        <input id="f-talla" class="form-control" type="number" step="0.5" min="1" max="60" placeholder="42" value="${z.talla ?? ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Género *</label>
        <select id="f-genero" class="form-select">
          <option value="">— Seleccionar —</option>
          ${sel(generos, z.genero)}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Categoría *</label>
        <select id="f-categoria" class="form-select">
          <option value="">— Seleccionar —</option>
          ${sel(categorias, z.categoria)}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Precio *</label>
        <input id="f-precio" class="form-control" type="number" step="0.01" min="0.01" placeholder="150000" value="${z.precio ?? ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Stock *</label>
        <input id="f-stock" class="form-control" type="number" min="0" placeholder="0" value="${z.stock ?? ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">SKU</label>
        <input id="f-sku" class="form-control" placeholder="Opcional" value="${z.sku ?? ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <input id="f-descripcion" class="form-control" placeholder="Opcional" value="${z.descripcion ?? ''}">
      </div>
    </div>
  `;
}

function leerFormZapato() {
    const campos = {
        marca: document.getElementById('f-marca') ?.value.trim(),
        modelo: document.getElementById('f-modelo') ?.value.trim(),
        color: document.getElementById('f-color') ?.value.trim(),
        talla: parseFloat(document.getElementById('f-talla') ?.value),
        genero: document.getElementById('f-genero') ?.value,
        categoria: document.getElementById('f-categoria') ?.value,
        precio: parseFloat(document.getElementById('f-precio') ?.value),
        stock: parseInt(document.getElementById('f-stock') ?.value),
        sku: document.getElementById('f-sku') ?.value.trim() || undefined,
        descripcion: document.getElementById('f-descripcion') ?.value.trim() || undefined,
    };

    // Validación básica
    if (!campos.marca) { showToast('La marca es obligatoria', 'warning'); return null; }
    if (!campos.modelo) { showToast('El modelo es obligatorio', 'warning'); return null; }
    if (!campos.color) { showToast('El color es obligatorio', 'warning'); return null; }
    if (!campos.talla || campos.talla < 1) { showToast('Talla inválida', 'warning'); return null; }
    if (!campos.genero) { showToast('Selecciona el género', 'warning'); return null; }
    if (!campos.categoria) { showToast('Selecciona la categoría', 'warning'); return null; }
    if (!campos.precio || campos.precio <= 0) { showToast('Precio inválido', 'warning'); return null; }
    if (campos.stock < 0 || isNaN(campos.stock)) { showToast('Stock inválido', 'warning'); return null; }

    return campos;
}

// ── Utilidades visuales ───────────────────────────────────────
function colorCSS(nombre) {
    if (!nombre) return '#555';
    const map = {
        negro: '#111',
        blanco: '#eee',
        rojo: '#e74c3c',
        azul: '#3498db',
        verde: '#2ecc71',
        amarillo: '#f1c40f',
        naranja: '#e67e22',
        gris: '#7f8c8d',
        rosa: '#e91e8c',
        morado: '#9b59b6',
        café: '#795548',
        marron: '#795548',
        beige: '#d2b48c',
    };
    return map[nombre.toLowerCase()] ?? '#888';
}

function formatCategoria(cat) {
    if (!cat) return '—';
    return cat.charAt(0) + cat.slice(1).toLowerCase().replace(/_/g, ' ');
}