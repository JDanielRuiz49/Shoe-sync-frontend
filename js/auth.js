// ============================================================
//  auth.js — Manejo de sesión, login y registro
// ============================================================

// ── Helpers de sesión ────────────────────────────────────────
const SESSION_KEY = 'calzados_user';

function guardarSesion(usuario) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
}

function obtenerSesion() {
    try {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch {
        return null;
    }
}

function cerrarSesion() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
}

function requiereAuth() {
    if (!obtenerSesion()) {
        window.location.href = 'index.html';
    }
}

// ── Toast ────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    toast.textContent = `${icons[type] ?? ''} ${message}`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ── Lógica de la página de Login ─────────────────────────────
function initLoginPage() {
    // Si ya hay sesión activa, ir al dashboard
    if (obtenerSesion()) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Tabs login / registro
    const tabLogin = document.getElementById('tab-login');
    const tabRegistro = document.getElementById('tab-registro');
    const panelLogin = document.getElementById('panel-login');
    const panelReg = document.getElementById('panel-registro');

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegistro.classList.remove('active');
        panelLogin.classList.add('active');
        panelReg.classList.remove('active');
    });

    tabRegistro.addEventListener('click', () => {
        tabRegistro.classList.add('active');
        tabLogin.classList.remove('active');
        panelReg.classList.add('active');
        panelLogin.classList.remove('active');
    });

    // ── Formulario LOGIN ──
    document.getElementById('form-login').addEventListener('submit', async(e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-login');
        const username = document.getElementById('login-user').value.trim();
        const password = document.getElementById('login-pass').value;

        if (!username || !password) {
            showToast('Completa todos los campos', 'warning');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-sm"></span> Ingresando...';

        try {
            const res = await apiLogin(username, password);

            if (res.ok) {
                // El backend devuelve el objeto Usuario
                const usuario = res.data ?? { username };
                guardarSesion(usuario);
                showToast('Sesión iniciada', 'success', 1500);
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
            } else {
                const msg = typeof res.data === 'string' ? res.data : 'Credenciales incorrectas';
                showToast(msg, 'error');
            }
        } catch (err) {
            showToast('No se pudo conectar al servidor', 'error');
            console.error(err);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Ingresar';
        }
    });

    // ── Formulario REGISTRO ──
    document.getElementById('form-registro').addEventListener('submit', async(e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-registro');

        const usuario = document.getElementById('reg-usuario').value.trim();
        const correo = document.getElementById('reg-correo').value.trim();
        const contrasena = document.getElementById('reg-pass').value;
        const confirmar = document.getElementById('reg-pass2').value;

        if (!usuario || !correo || !contrasena) {
            showToast('Completa todos los campos', 'warning');
            return;
        }
        if (contrasena !== confirmar) {
            showToast('Las contraseñas no coinciden', 'warning');
            return;
        }
        if (contrasena.length < 6) {
            showToast('La contraseña debe tener mínimo 6 caracteres', 'warning');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Registrando...';

        try {
            const res = await apiRegistro(usuario, correo, contrasena);

            if (res.ok || res.status === 201) {
                showToast('Cuenta creada. Ahora inicia sesión.', 'success');
                // Cambiar a pestaña login
                tabLogin.click();
                document.getElementById('login-user').value = usuario;
            } else {
                const msg = typeof res.data === 'string' ? res.data : 'Error al registrar';
                showToast(msg, 'error');
            }
        } catch (err) {
            showToast('No se pudo conectar al servidor', 'error');
            console.error(err);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Crear cuenta';
        }
    });
}