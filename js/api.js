// ============================================================
//  api.js — Capa de comunicación con el backend
//  BASE: http://localhost:8081
// ============================================================

const API_BASE = 'http://localhost:8081';


async function apiFetch(path, options = {}) {
    const url = `${API_BASE}${path}`;

    const defaults = {
        headers: { 'Content-Type': 'application/json' },
    };


    const config = {
        ...defaults,
        ...options,
        headers: {...defaults.headers, ...(options.headers || {}) },
    };

    const response = await fetch(url, config);

    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { ok: response.ok, status: response.status, data: null };
    }

    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    return { ok: response.ok, status: response.status, data };
}

// ============================================================
//  AUTH
// ============================================================

/**
 * POST /auth/login
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ok, status, data}>}
 */
async function apiLogin(username, password) {
    return apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

/**
 * POST /auth/registro
 * @param {string} usuario
 * @param {string} correo
 * @param {string} contraseña
 * @returns {Promise<{ok, status, data}>}
 */
async function apiRegistro(usuario, correo, contraseña) {
    return apiFetch('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({ usuario, correo, contraseña }),
    });
}

// ============================================================
//  ZAPATOS
// ============================================================

/**
 * GET /zapatos  — Obtener todos los zapatos
 * @returns {Promise<ZapatoResponse[]>}
 */
async function apiGetZapatos() {
    const res = await apiFetch('/zapatos');
    if (!res.ok) throw new Error('Error al obtener el inventario');
    return res.data; // Array de ZapatoResponse
}

/**
 * POST /zapatos/crear  — Crear nuevo zapato
 * @param {ZapatoRequest} zapato
 * @returns {Promise<ZapatoResponse>}
 */
async function apiCrearZapato(zapato) {
    const res = await apiFetch('/zapatos/crear', {
        method: 'POST',
        body: JSON.stringify(zapato),
    });
    return res;
}


async function apiEditarZapato(sku, zapato) {
    const res = await apiFetch(`/zapatos/${encodeURIComponent(sku)}`, {
        method: 'PUT',
        body: JSON.stringify(zapato),
    });
    return res;
}

/**
 * DELETE /zapatos/{sku}  — Eliminar zapato  [PENDIENTE BACKEND]
 */
async function apiEliminarZapato(sku) {
    const res = await apiFetch(`/zapatos/${encodeURIComponent(sku)}`, {
        method: 'DELETE',
    });
    return res;
}

/**
 * PATCH /zapatos/{sku}/stock  — Ajustar stock  [PENDIENTE BACKEND]
 * @param {string} sku
 * @param {number} cantidad  
 */
async function apiAjustarStock(sku, cantidad) {
    const res = await apiFetch(`/zapatos/${encodeURIComponent(sku)}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ cantidad }),
    });
    return res;
}