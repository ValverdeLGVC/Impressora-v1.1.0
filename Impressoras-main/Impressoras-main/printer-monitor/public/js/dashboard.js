document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('auth-ready', () => {
        fetchData();
        setInterval(fetchData, 30000);
    }, { once: true });
});

async function fetchData() {
    const timeDisplay = document.getElementById('last-update');
    timeDisplay.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i> Atualizando...';

    try {
        const response = await fetch('/api/printers');
        const result = await response.json();

        if (result.success) {
            renderDashboard(result.data);
                if (typeof window.renderFeatures === 'function') window.renderFeatures(result.data);
            if (window.currentUser?.role === 'master') window.loadTonerData?.();
            updateTime(timeDisplay);
        }
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        timeDisplay.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: red;"></i> Erro de conexão';
    }
}

function updateTime(element) {
    const now = new Date();
    element.innerHTML = `Última atualização: ${now.toLocaleTimeString()}`;
}

function renderDashboard(printers) {
    // 1. Calcular estatísticas
    const stats = {
        total: printers.length,
        online: printers.filter(p => p.status === 'online').length,
        offline: printers.filter(p => p.status === 'offline').length,
        critical: 0
    };

    let printersHTML = '';

    printers.forEach(printer => {
        const isOnline = printer.status === 'online';
        let tonersHTML = '';

        if (isOnline && printer.toners) {
            printer.toners.forEach(toner => {
                let statusClass = 'normal';
                if (toner.level <= 10) { statusClass = 'critical'; stats.critical++; }
                else if (toner.level <= 30) { statusClass = 'warning'; }

                tonersHTML += `
                    <div class="toner-section">
                        <div class="toner-info">
                            <span>${toner.color}</span>
                            <span>${toner.level}%</span>
                        </div>
                        <div class="progress-bg">
                            <div class="progress-bar ${statusClass}" style="width: ${toner.level}%"></div>
                        </div>
                    </div>
                `;
            });
        } else {
            tonersHTML = `
                <div class="toner-section" style="text-align:center; padding: 1rem 0; color: var(--text-muted);">
                    <i class="fa-solid fa-link-slash"></i> Sem comunicação SNMP
                </div>
            `;
        }

        printersHTML += `
            <div class="printer-card">
                <div class="printer-header">
                    <div class="printer-info">
                        <h3><i class="fa-solid fa-print"></i> ${printer.name}</h3>
                        <p>IP: ${printer.ip} | Loc: ${printer.location}</p>
                    </div>
                    <span class="status-badge ${printer.status}">
                        <i class="fa-solid ${isOnline ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> 
                        ${printer.status.toUpperCase()}
                    </span>
                </div>
                ${printer.pageCount !== null && printer.pageCount !== undefined ? `<div class="printer-page-count">Total de impressões: ${printer.pageCount.toLocaleString('pt-BR')}</div>` : ''}
                ${tonersHTML}
            </div>
        `;
    });

    // Atualizar UI
    document.getElementById('summary-cards').innerHTML = `
        <div class="stat-card total"><div class="stat-title">Total</div><div class="stat-value">${stats.total}</div></div>
        <div class="stat-card online"><div class="stat-title">Online</div><div class="stat-value">${stats.online}</div></div>
        <div class="stat-card offline"><div class="stat-title">Offline</div><div class="stat-value">${stats.offline}</div></div>
        <div class="stat-card critical"><div class="stat-title">Toner Crítico</div><div class="stat-value">${stats.critical}</div></div>
    `;

    document.getElementById('printer-grid').innerHTML = printersHTML;
}