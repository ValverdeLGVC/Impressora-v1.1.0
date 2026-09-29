window.currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    const loginScreen = document.getElementById('login-screen');
    const appLayout = document.querySelector('.layout');
    const loginForm = document.getElementById('login-form');

    try {
        const response = await fetch('/api/auth/me');
        const result = await response.json();
        if (result.user) showApp(result.user);
        else showLogin();
    } catch (error) {
        showLogin('Não foi possível conectar ao servidor.');
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: document.getElementById('login-user').value, password: document.getElementById('login-password').value })
        });
        const result = await response.json();
        if (!result.success) return setLoginMessage(result.message);
        window.location.reload();
    });

    document.getElementById('logout-button').addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.reload();
    });

    document.getElementById('change-password-button').addEventListener('click', async () => {
        const currentPassword = prompt('Senha atual:');
        const newPassword = prompt('Nova senha (mínimo 8 caracteres):');
        if (!currentPassword || !newPassword) return;
        const response = await fetch('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
        const result = await response.json();
        alert(result.message);
    });

    function showLogin(message = '') {
        appLayout.style.display = 'none';
        loginScreen.style.display = 'grid';
        setLoginMessage(message);
    }

    function showApp(user) {
        window.currentUser = user;
        loginScreen.style.display = 'none';
        appLayout.style.display = 'flex';
        document.getElementById('current-user').textContent = `${user.username} (${user.role === 'master' ? 'Master' : 'Visualizador'})`;
        window.dispatchEvent(new Event('auth-ready'));
        if (user.role !== 'master') {
            ['nav-printers', 'nav-users', 'nav-counters', 'nav-alerts', 'nav-stock', 'nav-reports'].forEach(id => { document.getElementById(id).style.display = 'none'; });
        } else {
            document.getElementById('nav-users').addEventListener('click', async (event) => {
                event.preventDefault();
                window.showSection('users', 'Usuários');
                await loadUsers();
            });
            window.loadTonerData?.();
        }
    }

    function setLoginMessage(message) {
        document.getElementById('login-message').textContent = message;
    }

    async function loadUsers() {
        try {
            const response = await fetch('/api/users');
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
            document.getElementById('users-list').innerHTML = result.data.map(user => `<article class="user-row" data-user-row="${user.id}">
                <label>Usuário<input class="user-edit-name" value="${escapeHtml(user.username)}" maxlength="100" required></label>
                <label>Nível<select class="user-edit-role"><option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Visualizador</option><option value="master" ${user.role === 'master' ? 'selected' : ''}>Master</option></select></label>
                <label>Status<select class="user-edit-active"><option value="1" ${user.is_active ? 'selected' : ''}>Ativo</option><option value="0" ${!user.is_active ? 'selected' : ''}>Inativo</option></select></label>
                <div class="user-actions"><button class="btn btn-secondary user-save" type="button"><i class="fa-solid fa-floppy-disk"></i> Salvar</button><button class="btn btn-danger user-delete" type="button" ${user.id === window.currentUser.id ? 'disabled' : ''}><i class="fa-solid fa-trash"></i> Apagar</button></div>
                <small class="user-message" role="status"></small>
            </article>`).join('') || '<div class="empty-state"><h3>Nenhum usuário cadastrado</h3></div>';
            document.querySelectorAll('[data-user-row]').forEach(row => {
                row.querySelector('.user-save').addEventListener('click', async () => {
                    const response = await fetch(`/api/users/${row.dataset.userRow}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: row.querySelector('.user-edit-name').value.trim(), role: row.querySelector('.user-edit-role').value, isActive: row.querySelector('.user-edit-active').value === '1' })
                    });
                    const result = await response.json();
                    row.querySelector('.user-message').textContent = result.message;
                    if (result.success) await loadUsers();
                });
                row.querySelector('.user-delete').addEventListener('click', async () => {
                    if (!window.confirm('Apagar este usuário? Esta ação não pode ser desfeita.')) return;
                    const response = await fetch(`/api/users/${row.dataset.userRow}`, { method: 'DELETE' });
                    const result = await response.json();
                    row.querySelector('.user-message').textContent = result.message;
                    if (!result.success) window.alert(result.message);
                    else await loadUsers();
                });
            });
        } catch (error) {
            document.getElementById('users-list').textContent = error.message || 'Erro ao carregar usuários.';
        }
    }
    window.loadUsers = loadUsers;

    document.getElementById('user-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const response = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.getElementById('user-name').value, password: document.getElementById('user-password').value, role: document.getElementById('user-role').value }) });
        const result = await response.json();
        alert(result.message);
        if (result.success) { event.target.reset(); loadUsers(); }
    });
});

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}