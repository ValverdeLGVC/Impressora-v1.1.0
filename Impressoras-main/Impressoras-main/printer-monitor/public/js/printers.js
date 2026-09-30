document.addEventListener('DOMContentLoaded', () => {
    // Navegação do Menu
    const navDashboard = document.getElementById('nav-dashboard');
    const navPrinters = document.getElementById('nav-printers');

    const secDashboard = document.getElementById('dashboard-section'); // Precisamos agrupar os cards do dashboard nisso
    const secPrintersList = document.getElementById('printers-list-section');

    navPrinters.addEventListener('click', (e) => {
        e.preventDefault();
        navDashboard.classList.remove('active');
        navPrinters.classList.add('active');

        document.getElementById('summary-cards').style.display = 'none';
        document.getElementById('printer-grid').style.display = 'none';
        secPrintersList.style.display = 'block';

        loadPrintersTable();
    });

    navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        navPrinters.classList.remove('active');
        navDashboard.classList.add('active');

        document.getElementById('summary-cards').style.display = 'grid';
        document.getElementById('printer-grid').style.display = 'grid';
        secPrintersList.style.display = 'none';
    });

    // Lógica do Modal
    const modal = document.getElementById('printer-modal');
    const editModal = document.getElementById('printer-edit-modal');
    const editForm = document.getElementById('printer-edit-form');
    const btnNew = document.getElementById('btn-new-printer');
    const closeBtns = document.querySelectorAll('.close-modal, .close-modal-btn');

    btnNew.addEventListener('click', () => {
        document.getElementById('form-ip').value = '';
        document.getElementById('form-name').value = '';
        document.getElementById('test-result').innerHTML = '';
        modal.classList.add('show');
    });

    closeBtns.forEach(btn => btn.addEventListener('click', () => {
        modal.classList.remove('show');
        editModal.classList.remove('show');
    }));
    document.querySelectorAll('.close-printer-edit').forEach(button => button.addEventListener('click', () => editModal.classList.remove('show')));

    document.getElementById('printers-table-body').addEventListener('click', event => {
        const button = event.target.closest('[data-edit-printer]');
        if (!button) return;
        editForm.dataset.printerId = button.dataset.editPrinter;
        document.getElementById('printer-edit-name').value = button.dataset.printerName;
        document.getElementById('printer-edit-location').value = button.dataset.printerLocation;
        editModal.classList.add('show');
        document.getElementById('printer-edit-name').focus();
    });

    editForm.addEventListener('submit', async event => {
        event.preventDefault();
        const response = await fetch(`/api/printers/${editForm.dataset.printerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('printer-edit-name').value.trim(),
                location: document.getElementById('printer-edit-location').value.trim()
            })
        });
        const result = await response.json();
        if (!result.success) return alert(result.message);
        editModal.classList.remove('show');
        await loadPrintersTable();
        if (typeof fetchData === 'function') fetchData();
    });

    // Testar IP na rede
    document.getElementById('btn-test-ip').addEventListener('click', async () => {
        const ip = document.getElementById('form-ip').value;
        const resultLabel = document.getElementById('test-result');

        if (!ip) return alert('Digite um IP primeiro!');

        resultLabel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testando comunicação na rede...';
        resultLabel.style.color = 'var(--text-muted)';

        try {
            const response = await fetch('/api/printers/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip })
            });
            const result = await response.json();

            if (result.success) {
                resultLabel.innerHTML = `<i class="fa-solid fa-check"></i> ${result.message}`;
                resultLabel.style.color = 'var(--success)';
            } else {
                resultLabel.innerHTML = `<i class="fa-solid fa-xmark"></i> ${result.message}`;
                resultLabel.style.color = 'var(--danger)';
            }
        } catch (error) {
            resultLabel.innerHTML = 'Erro ao contatar o servidor.';
        }
    });

    // Salvar Impressora
    document.getElementById('btn-save-printer').addEventListener('click', async () => {
        const data = {
            ip: document.getElementById('form-ip').value,
            name: document.getElementById('form-name').value,
            location: document.getElementById('form-location').value,
            manufacturer: document.getElementById('form-mfg').value,
            model: document.getElementById('form-model').value
        };

        if (!data.name.trim()) return alert('Preencha o nome da impressora!');

        const res = await fetch('/api/printers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (result.success) {
            modal.classList.remove('show');
            loadPrintersTable(); // Recarrega a tabela
            if (typeof fetchData === 'function') fetchData(); // Atualiza dashboard
        } else {
            alert(result.message);
        }
    });
});

async function loadPrintersTable() {
    const response = await fetch('/api/printers');
    const result = await response.json();
    const tbody = document.getElementById('printers-table-body');

    tbody.innerHTML = result.data.map(p => `
        <tr>
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td>${escapeHtml(p.ip || 'Fora da rede')}</td>
            <td>${escapeHtml(p.location || '-')}</td>
            <td><span class="status-badge ${p.status}">${p.status.toUpperCase()}</span></td>
            <td>
                <div class="printer-actions">
                <button class="btn btn-secondary" type="button" data-edit-printer="${p.id}" data-printer-name="${escapeHtml(p.name)}" data-printer-location="${escapeHtml(p.location || '')}" title="Editar impressora" aria-label="Editar ${escapeHtml(p.name)}"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger" type="button" onclick="deletePrinter(${p.id})" title="Apagar impressora" aria-label="Apagar ${escapeHtml(p.name)}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

async function deletePrinter(id) {
    if (confirm('Tem certeza que deseja remover esta impressora?')) {
        await fetch(`/api/printers/${id}`, { method: 'DELETE' });
        loadPrintersTable();
        if (typeof fetchData === 'function') fetchData();
    }
}