const COUNTERS_KEY = 'printer-monitor-counters';
let currentPrinters = [];

window.renderFeatures = function (printers) {
    currentPrinters = printers || [];
    populateCounterPrinters();
    renderCounters();
    renderAlerts();
};

document.addEventListener('DOMContentLoaded', () => {
    const navigation = {
        'nav-dashboard': ['dashboard', 'Dashboard'],
        'nav-printers': ['printers', 'Impressoras'],
        'nav-counters': ['counters', 'Contadores'],
        'nav-alerts': ['alerts', 'Alertas'],
        'nav-stock': ['stock', 'Estoque'],
        'nav-reports': ['reports', 'Relatórios'],
        'nav-inventory-report': ['inventory-report', 'Inventário geral']
    };

    Object.entries(navigation).forEach(([id, [section, title]]) => {
        document.getElementById(id).addEventListener('click', (event) => {
            event.preventDefault();
            showSection(section, title);
        });
    });

    document.getElementById('counter-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const printerId = Number(document.getElementById('counter-printer').value);
        const printer = currentPrinters.find(item => item.id === printerId);
        const target = Number(document.getElementById('counter-target').value);
        const name = document.getElementById('counter-name').value.trim();

        if (!printer || !name || !target || target < 1) return;

        const counters = readCounters();
        counters.push({
            id: Date.now(),
            printerId,
            name,
            target,
            startPageCount: printer.pageCount || 0
        });
        saveCounters(counters);
        event.target.reset();
        renderCounters();
    });
});

function showSection(section, title) {
    const sections = {
        dashboard: ['summary-cards', 'printer-grid', 'toner-dashboard'],
        printers: ['printers-list-section'],
        users: ['users-section'],
        counters: ['counters-section'],
        alerts: ['alerts-section'],
        stock: ['stock-section'],
        reports: ['reports-section'],
        'inventory-report': ['inventory-report-section']
    };

    ['summary-cards', 'printer-grid', 'toner-dashboard', 'printers-list-section', 'users-section', 'counters-section', 'alerts-section', 'stock-section', 'reports-section', 'inventory-report-section']
        .forEach(id => { document.getElementById(id).style.display = 'none'; });

    sections[section].forEach(id => {
        document.getElementById(id).style.display = id === 'summary-cards' ? 'grid' : id === 'printer-grid' ? 'grid' : 'block';
    });

    document.querySelectorAll('.sidebar nav a').forEach(link => link.classList.remove('active'));
    document.getElementById(`nav-${section}`).classList.add('active');
    document.querySelector('header h1').textContent = title;

    if (section === 'counters') renderCounters();
    if (section === 'alerts') renderAlerts();
    if (section === 'stock' || section === 'reports' || section === 'inventory-report') window.loadTonerData?.();
}

window.showSection = showSection;

function readCounters() {
    try {
        return JSON.parse(localStorage.getItem(COUNTERS_KEY) || '[]');
    } catch (error) {
        return [];
    }
}

function saveCounters(counters) {
    localStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
}

function populateCounterPrinters() {
    const select = document.getElementById('counter-printer');
    if (!select) return;
    const selected = select.value;
    select.innerHTML = currentPrinters.length
        ? currentPrinters.map(printer => `<option value="${printer.id}">${printer.name} (${formatNumber(printer.pageCount)})</option>`).join('')
        : '<option value="">Nenhuma impressora encontrada</option>';
    if (selected) select.value = selected;
}

function renderCounters() {
    const container = document.getElementById('counters-list');
    if (!container) return;
    const counters = readCounters();

    if (!counters.length) {
        container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-calculator"></i><h3>Nenhum contador criado</h3><p>Defina uma meta de páginas para começar a acompanhar a produção.</p></div>';
        return;
    }

    container.innerHTML = counters.map(counter => {
        const printer = currentPrinters.find(item => item.id === counter.printerId);
        const current = printer && printer.pageCount !== null ? printer.pageCount : counter.startPageCount;
        const produced = Math.max(0, current - counter.startPageCount);
        const remaining = Math.max(0, counter.target - produced);
        const progress = Math.min(100, Math.round(produced / counter.target * 100));
        return `<article class="counter-card">
            <div class="counter-card-header"><div><p class="eyebrow">${printer ? printer.name : 'Impressora removida'}</p><h3>${counter.name}</h3></div><strong>${formatNumber(remaining)} faltam</strong></div>
            <div class="counter-progress"><div style="width: ${progress}%"></div></div>
            <div class="counter-metrics"><span>Produzidas: <b>${formatNumber(produced)}</b></span><span>Meta: <b>${formatNumber(counter.target)}</b></span><span>${progress}%</span></div>
            <div class="counter-actions"><button class="btn btn-secondary" onclick="resetCounter(${counter.id})"><i class="fa-solid fa-rotate-left"></i> Resetar</button><button class="btn btn-danger" onclick="deleteCounter(${counter.id})"><i class="fa-solid fa-trash"></i> Remover</button></div>
        </article>`;
    }).join('');
}

function resetCounter(id) {
    const printer = currentPrinters.find(item => item.id === readCounters().find(counter => counter.id === id)?.printerId);
    const counters = readCounters().map(counter => counter.id === id ? { ...counter, startPageCount: printer?.pageCount || counter.startPageCount } : counter);
    saveCounters(counters);
    renderCounters();
}

function deleteCounter(id) {
    saveCounters(readCounters().filter(counter => counter.id !== id));
    renderCounters();
}

function renderAlerts() {
    const container = document.getElementById('alerts-list');
    if (!container) return;
    const alerts = [];
    currentPrinters.forEach(printer => {
        if (printer.status !== 'online') alerts.push({ type: 'danger', icon: 'fa-circle-xmark', title: `${printer.name} sem conexão`, text: `Não foi possível consultar a impressora em ${printer.ip}.` });
        (printer.toners || []).forEach(toner => {
            if (toner.level <= 10) alerts.push({ type: 'danger', icon: 'fa-droplet', title: `${toner.color} em nível crítico`, text: `${printer.name}: ${toner.level}% disponível.` });
            else if (toner.level <= 30) alerts.push({ type: 'warning', icon: 'fa-droplet', title: `${toner.color} baixo`, text: `${printer.name}: ${toner.level}% disponível.` });
        });
    });

    container.innerHTML = alerts.length ? alerts.map(alert => `<article class="alert-item ${alert.type}"><i class="fa-solid ${alert.icon}"></i><div><strong>${alert.title}</strong><p>${alert.text}</p></div></article>`).join('') : '<div class="empty-state"><i class="fa-solid fa-circle-check"></i><h3>Nenhum alerta ativo</h3><p>Todas as impressoras e suprimentos estão dentro do monitoramento atual.</p></div>';
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('pt-BR');
}

window.resetCounter = resetCounter;
window.deleteCounter = deleteCounter;
