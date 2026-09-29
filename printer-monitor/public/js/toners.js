let tonerData = { inventory: [], printers: [], usage: [], settings: {} };
let tonerLoadPromise = null;
let selectedReportMonths = [];
let reportMode = 'month';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('toner-inventory-form').addEventListener('submit', saveInventory);
    document.getElementById('toner-usage-form').addEventListener('submit', saveUsage);
    document.getElementById('toner-settings-form').addEventListener('submit', saveSettings);
    document.getElementById('usage-printer').addEventListener('change', populateUsageToners);
    document.getElementById('stock-new-printer').addEventListener('click', () => {
        window.showSection('printers', 'Impressoras');
        document.getElementById('btn-new-printer').click();
    });
    document.getElementById('report-month-mode').addEventListener('click', () => setReportMode('month'));
    document.getElementById('report-general-mode').addEventListener('click', () => setReportMode('general'));
    document.getElementById('add-report-month').addEventListener('click', addReportMonth);
    document.getElementById('generate-report').addEventListener('click', generateReport);
    document.getElementById('report-recommendation').addEventListener('input', syncRecommendation);
    document.getElementById('usage-date').value = localDate();
    document.getElementById('report-month').value = localDate().slice(0, 7);
    document.getElementById('report-month-add').value = localDate().slice(0, 7);
    window.addEventListener('auth-ready', () => {
        if (window.currentUser?.role === 'master') window.loadTonerData();
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-report'));
});

window.loadTonerData = async function () {
    if (tonerLoadPromise) return tonerLoadPromise;
    tonerLoadPromise = (async () => {
        try {
            const response = await fetch('/api/toners');
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Erro ao carregar estoque.');
            tonerData = result.data;
            renderTonerData();
        } catch (error) {
            const list = document.getElementById('stock-list');
            if (list) list.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        } finally {
            tonerLoadPromise = null;
        }
    })();
    return tonerLoadPromise;
};

function renderTonerData() {
    populatePrinterControls();
    renderInventory();
    renderUsage();
    renderStockSummary();
    renderTonerDashboard();
    populateReportPrinters();
    hydrateSettings();
}

function populatePrinterControls() {
    const options = tonerData.printers.map(printer => `<option value="${printer.id}">${escapeHtml(printer.name)}</option>`).join('');
    const inventoryPrinters = document.getElementById('toner-printers');
    const usageSelect = document.getElementById('usage-printer');
    const oldPrinter = usageSelect.value;
    inventoryPrinters.innerHTML = printerCheckboxes();
    usageSelect.innerHTML = options || '<option value="">Nenhuma impressora cadastrada</option>';
    if (oldPrinter) usageSelect.value = oldPrinter;
    populateUsageToners();
}

function printerCheckboxes(selectedIds = []) {
    return tonerData.printers.map(printer => `<label><input type="checkbox" name="printerIds" value="${printer.id}" ${selectedIds.includes(printer.id) ? 'checked' : ''}><span>${escapeHtml(printer.name)}</span></label>`).join('') || '<span class="muted">Nenhuma impressora cadastrada</span>';
}

function populateUsageToners() {
    const printerId = Number(document.getElementById('usage-printer').value);
    const select = document.getElementById('usage-toner');
    const items = tonerData.inventory.filter(item => item.printerIds.includes(printerId));
    select.innerHTML = items.length
        ? items.map(item => `<option value="${item.id}" ${Number(item.quantity) < 1 ? 'disabled' : ''}>${escapeHtml(item.model)} · ${escapeHtml(item.color)} · ${item.quantity} un.</option>`).join('')
        : '<option value="">Nenhum toner vinculado a esta impressora</option>';
}

async function saveInventory(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
        model: document.getElementById('toner-model').value.trim(),
        color: document.getElementById('toner-color').value.trim(),
        quantity: Number(document.getElementById('toner-quantity').value),
        minQuantity: Number(document.getElementById('toner-minimum').value),
        printerIds: [...document.querySelectorAll('#toner-printers input:checked')].map(input => Number(input.value))
    };
    if (!payload.printerIds.length) return window.alert('Selecione ao menos uma impressora compatível.');
    const result = await postJson('/api/toners/inventory', payload);
    if (!result.success) return window.alert(result.message);
    form.reset();
    document.getElementById('toner-minimum').value = 2;
    await window.loadTonerData();
}

async function saveUsage(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = await postJson('/api/toners/usage', {
        inventoryId: Number(document.getElementById('usage-toner').value),
        printerId: Number(document.getElementById('usage-printer').value),
        quantity: Number(document.getElementById('usage-quantity').value),
        usedAt: document.getElementById('usage-date').value,
        notes: document.getElementById('usage-notes').value.trim()
    });
    if (!result.success) return window.alert(result.message);
    form.reset();
    document.getElementById('usage-date').value = localDate();
    document.getElementById('usage-quantity').value = 1;
    await window.loadTonerData();
}

async function saveSettings(event) {
    event.preventDefault();
    const result = await postJson('/api/toners/settings', {
        alertEnabled: document.getElementById('alerts-enabled').checked,
        alertThreshold: Number(document.getElementById('alert-threshold').value),
        replenishTarget: Number(document.getElementById('replenish-target').value),
        notifyEmail: document.getElementById('notify-email').value.trim(),
        notifyWhatsapp: document.getElementById('notify-whatsapp').value.trim(),
        decision: document.getElementById('stock-decision').value.trim()
    }, 'PUT');
    window.alert(result.message);
    if (result.success) await window.loadTonerData();
}

async function postJson(url, payload, method = 'POST') {
    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Não foi possível contatar o servidor.' };
    }
}

function renderInventory() {
    const list = document.getElementById('stock-list');
    if (!tonerData.inventory.length) {
        list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-box-open"></i><h3>Estoque vazio</h3></div>';
        populateUsageToners();
        return;
    }
    list.innerHTML = tonerData.inventory.map(item => {
        const low = isLowStock(item);
        return `<article class="stock-row toner-stock-row">
            <div class="toner-stock-main"><div><strong>${escapeHtml(item.model)} · ${escapeHtml(item.color)}</strong><p>Vinculado a: ${escapeHtml(item.printerNames)}</p><p>Mínimo: ${item.min_quantity} unidade(s)</p></div><span class="stock-quantity ${low ? 'low' : ''}">${item.quantity}<small>un.</small></span></div>
            <div class="toner-stock-actions"><button class="btn btn-secondary" type="button" data-edit-inventory="${item.id}"><i class="fa-solid fa-pen"></i> Editar</button><button class="btn btn-danger" type="button" data-delete-inventory="${item.id}"><i class="fa-solid fa-trash"></i></button></div>
            <form class="inventory-edit-form" data-edit-form="${item.id}" hidden>
                <label>Modelo<input name="model" value="${escapeHtml(item.model)}" maxlength="120" required></label><label>Cor / tipo<input name="color" value="${escapeHtml(item.color)}" maxlength="40" required></label>
                <label>Quantidade<input name="quantity" type="number" min="0" step="1" value="${item.quantity}" required></label><label>Estoque mínimo<input name="minQuantity" type="number" min="0" step="1" value="${item.min_quantity}" required></label>
                <fieldset class="printer-filter"><legend>Impressoras vinculadas</legend><div class="printer-checkboxes">${printerCheckboxes(item.printerIds)}</div></fieldset>
                <div class="toner-stock-actions"><button class="btn btn-primary" type="submit">Salvar</button><button class="btn btn-secondary" data-cancel-edit="${item.id}" type="button">Cancelar</button></div>
            </form>
        </article>`;
    }).join('');
    list.querySelectorAll('[data-edit-inventory]').forEach(button => button.addEventListener('click', () => {
        list.querySelector(`[data-edit-form="${button.dataset.editInventory}"]`).hidden = false;
    }));
    list.querySelectorAll('[data-cancel-edit]').forEach(button => button.addEventListener('click', () => {
        list.querySelector(`[data-edit-form="${button.dataset.cancelEdit}"]`).hidden = true;
    }));
    list.querySelectorAll('[data-edit-form]').forEach(form => form.addEventListener('submit', async event => {
        event.preventDefault();
        const data = new FormData(form);
        const payload = Object.fromEntries(['model', 'color', 'quantity', 'minQuantity'].map(key => [key, data.get(key)]));
        payload.quantity = Number(payload.quantity);
        payload.minQuantity = Number(payload.minQuantity);
        payload.printerIds = [...form.querySelectorAll('[name="printerIds"]:checked')].map(input => Number(input.value));
        if (!payload.printerIds.length) return window.alert('Selecione ao menos uma impressora compatível.');
        const result = await postJson(`/api/toners/inventory/${form.dataset.editForm}`, payload, 'PUT');
        if (!result.success) return window.alert(result.message);
        await window.loadTonerData();
    }));
    list.querySelectorAll('[data-delete-inventory]').forEach(button => button.addEventListener('click', async () => {
        if (!window.confirm('Remover este toner do estoque? O histórico de consumo será mantido.')) return;
        const response = await fetch(`/api/toners/inventory/${button.dataset.deleteInventory}`, { method: 'DELETE' });
        const result = await response.json();
        if (!result.success) return window.alert(result.message);
        await window.loadTonerData();
    }));
    populateUsageToners();
}

function renderUsage() {
    const list = document.getElementById('toner-usage-list');
    list.innerHTML = tonerData.usage.length ? tonerData.usage.slice(0, 12).map(entry => `<article class="usage-row"><div><strong>${escapeHtml(entry.model)} · ${escapeHtml(entry.color)}</strong><p>${escapeHtml(entry.printerName)} · ${formatDate(entry.usedAt)}</p>${entry.notes ? `<p>${escapeHtml(entry.notes)}</p>` : ''}</div><span>${entry.quantity} un.</span></article>`).join('') : '<div class="empty-state"><h3>Nenhuma troca registrada</h3></div>';
}

function renderStockSummary() {
    const units = tonerData.inventory.reduce((sum, item) => sum + Number(item.quantity), 0);
    const low = tonerData.inventory.filter(isLowStock).length;
    document.getElementById('stock-summary').innerHTML = `<div class="stat-card total"><div class="stat-title">Modelos cadastrados</div><div class="stat-value">${tonerData.inventory.length}</div></div><div class="stat-card online"><div class="stat-title">Unidades disponíveis</div><div class="stat-value">${formatNumber(units)}</div></div><div class="stat-card critical"><div class="stat-title">Abaixo do mínimo</div><div class="stat-value">${low}</div></div>`;
}

function renderTonerDashboard() {
    const month = localDate().slice(0, 7);
    const units = tonerData.inventory.reduce((sum, item) => sum + Number(item.quantity), 0);
    const low = tonerData.inventory.filter(isLowStock).length;
    const used = tonerData.usage.filter(entry => String(entry.usedAt).startsWith(month)).reduce((sum, entry) => sum + Number(entry.quantity), 0);
    document.getElementById('toner-dashboard').innerHTML = `<div class="toner-dashboard-heading"><h2>Suprimentos</h2><button type="button" class="text-action" data-go-stock>Gerenciar estoque <i class="fa-solid fa-arrow-right"></i></button></div><div class="toner-dashboard-metrics"><div><span>Unidades em estoque</span><strong>${formatNumber(units)}</strong></div><div><span>Itens para reposição</span><strong class="${low ? 'text-danger' : ''}">${low}</strong></div><div><span>Trocas neste mês</span><strong>${used}</strong></div></div><div class="toner-dashboard-low">${tonerData.inventory.filter(isLowStock).slice(0, 4).map(item => `<span>${escapeHtml(item.model)} · ${escapeHtml(item.color)}: <b>${item.quantity} un.</b></span>`).join('') || '<span>Todos os itens acima do estoque mínimo.</span>'}</div>`;
    document.querySelector('[data-go-stock]')?.addEventListener('click', () => window.showSection('stock', 'Estoque'));
}

function hydrateSettings() {
    const settings = tonerData.settings || {};
    const form = document.getElementById('toner-settings-form');
    if (!form.dataset.hydrated || !form.contains(document.activeElement)) {
        document.getElementById('alerts-enabled').checked = Boolean(Number(settings.alert_enabled));
        document.getElementById('alert-threshold').value = settings.alert_threshold ?? 2;
        document.getElementById('replenish-target').value = settings.replenish_target ?? 5;
        document.getElementById('notify-email').value = settings.notify_email || '';
        document.getElementById('notify-whatsapp').value = settings.notify_whatsapp || '';
        document.getElementById('stock-decision').value = settings.decision || '';
        form.dataset.hydrated = 'true';
    }
    const channels = tonerData.notificationChannels || {};
    document.getElementById('notification-state').textContent = settings.alert_enabled
        ? `Alertas ativados. E-mail: ${channels.email ? 'integrado' : 'configure RESEND_API_KEY e RESEND_FROM_EMAIL no servidor'}. WhatsApp: ${channels.whatsapp ? 'integrado' : 'configure a WhatsApp Cloud API no servidor'}${channels.whatsapp && !channels.whatsappTemplate ? '; mensagens proativas podem exigir um modelo aprovado' : ''}.`
        : 'Alertas automáticos desativados.';
}

function populateReportPrinters() {
    const container = document.getElementById('report-printers');
    if (!container) return;
    const selected = new Set([...container.querySelectorAll('input:checked')].map(input => input.value));
    container.innerHTML = tonerData.printers.map(printer => `<label><input type="checkbox" value="${printer.id}" ${!selected.size || selected.has(String(printer.id)) ? 'checked' : ''}><span>${escapeHtml(printer.name)}</span></label>`).join('') || '<span class="muted">Nenhuma impressora cadastrada</span>';
}

function setReportMode(mode) {
    reportMode = mode;
    const monthly = mode === 'month';
    document.getElementById('single-month-control').hidden = !monthly;
    document.getElementById('multi-month-control').hidden = monthly;
    document.getElementById('report-month-mode').className = `btn ${monthly ? 'btn-primary' : 'btn-secondary'}`;
    document.getElementById('report-general-mode').className = `btn ${monthly ? 'btn-secondary' : 'btn-primary'}`;
    document.getElementById('report-month-mode').setAttribute('aria-pressed', String(monthly));
    document.getElementById('report-general-mode').setAttribute('aria-pressed', String(!monthly));
}

function addReportMonth() {
    const input = document.getElementById('report-month-add');
    if (!input.value) return;
    if (!selectedReportMonths.includes(input.value)) {
        if (selectedReportMonths.length >= 5) return window.alert('O relatório geral permite comparar até 5 meses.');
        selectedReportMonths.push(input.value);
        selectedReportMonths.sort();
    }
    renderSelectedMonths();
}

function renderSelectedMonths() {
    document.getElementById('selected-months').innerHTML = selectedReportMonths.map(month => `<span>${escapeHtml(formatMonth(month))}<button type="button" aria-label="Remover ${escapeHtml(formatMonth(month))}" data-remove-month="${month}"><i class="fa-solid fa-xmark"></i></button></span>`).join('');
    document.querySelectorAll('[data-remove-month]').forEach(button => button.addEventListener('click', () => {
        selectedReportMonths = selectedReportMonths.filter(month => month !== button.dataset.removeMonth);
        renderSelectedMonths();
    }));
}

async function generateReport() {
    const months = reportMode === 'month' ? [document.getElementById('report-month').value] : selectedReportMonths;
    const message = document.getElementById('report-message');
    if (!months.length || months.some(month => !/^\d{4}-\d{2}$/.test(month))) {
        message.textContent = reportMode === 'month' ? 'Selecione o mês do relatório.' : 'Adicione ao menos um mês para comparar.';
        return;
    }
    const printerIds = [...document.querySelectorAll('#report-printers input:checked')].map(input => input.value);
    if (!printerIds.length) {
        message.textContent = 'Selecione ao menos uma impressora para gerar o relatório.';
        return;
    }
    message.textContent = 'Carregando dados do relatório...';
    const params = new URLSearchParams({ months: months.join(','), printerIds: printerIds.join(',') });
    try {
        const response = await fetch(`/api/toners/report?${params}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Erro ao gerar relatório.');
        renderReport(result.data, months);
        message.textContent = 'Relatório pronto para revisar e imprimir.';
    } catch (error) {
        message.textContent = error.message;
    }
}

function renderReport(data, months) {
    const totals = Object.fromEntries(months.map(month => [month, 0]));
    data.usage.forEach(row => { totals[row.month] = (totals[row.month] || 0) + Number(row.quantity); });
    const peakMonth = months.reduce((peak, month) => totals[month] > (totals[peak] || 0) ? month : peak, months[0]);
    const average = Math.ceil(Object.values(totals).reduce((sum, total) => sum + total, 0) / Math.max(months.length, 1));
    const suggestion = document.getElementById('report-recommendation');
    suggestion.value = average;
    document.getElementById('recommendation-context').textContent = `Base: média observada de ${average} unidade(s) por mês; ajuste antes de imprimir.`;
    const detailRows = data.usage.map(row => `<tr><td>${escapeHtml(formatMonth(row.month))}</td><td>${escapeHtml(row.printerName || 'Impressora removida')}</td><td>${escapeHtml(row.model)} · ${escapeHtml(row.color)}</td><td>${row.quantity}</td></tr>`).join('');
    const bars = months.map(month => {
        const width = Math.max(2, Math.round((totals[month] / Math.max(...Object.values(totals), 1)) * 100));
        return `<div class="report-bar-row"><span>${escapeHtml(formatMonth(month))}</span><div class="report-bar-track"><div style="width:${width}%"></div></div><strong>${totals[month]} un.</strong></div>`;
    }).join('');
    const stockRows = data.inventory.map(item => `<tr><td>${escapeHtml(item.model)}</td><td>${escapeHtml(item.color)}</td><td>${escapeHtml(item.printerNames || 'Sem vínculo')}</td><td>${item.quantity}</td><td>${item.min_quantity}</td></tr>`).join('');
    const reportTitle = reportMode === 'month' ? `Relatório mensal · ${formatMonth(months[0])}` : 'Relatório geral comparativo';
    const monthlyUsage = Object.values(totals).reduce((sum, total) => sum + total, 0);
    document.getElementById('report-preview').innerHTML = `<div class="report-toolbar"><span><i class="fa-solid fa-eye"></i> Prévia editável</span><div><button class="btn btn-secondary" type="button" id="edit-report" aria-pressed="false"><i class="fa-solid fa-pen"></i> Editar conteúdo</button> <button class="btn btn-primary" type="button" id="print-report"><i class="fa-solid fa-file-pdf"></i> Imprimir / Salvar PDF</button></div></div>
        <article class="print-report" id="report-document"><header class="report-header"><div><p class="eyebrow">PrintMonitor · Suprimentos</p><h2>${escapeHtml(reportTitle)}</h2><p>Gerado em ${escapeHtml(new Date().toLocaleDateString('pt-BR'))}</p></div><strong class="report-total">${monthlyUsage}<small>unidades consumidas</small></strong></header>
        <section class="report-block"><h3>Comparativo de consumo</h3><div class="report-chart">${bars}</div><p class="report-insight">${months.length > 1 ? `Maior consumo no período: ${escapeHtml(formatMonth(peakMonth))} (${totals[peakMonth]} unidade(s)).` : `Consumo registrado em ${escapeHtml(formatMonth(months[0]))}: ${totals[months[0]]} unidade(s).`}</p></section>
        <section class="report-block"><h3>Consumo detalhado</h3><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Mês</th><th>Impressora</th><th>Modelo / tipo</th><th>Unidades</th></tr></thead><tbody>${detailRows || '<tr><td colspan="4">Nenhuma troca registrada no período selecionado.</td></tr>'}</tbody></table></div></section>
        <section class="report-block"><h3>Estoque atual</h3><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Modelo</th><th>Cor / tipo</th><th>Impressoras</th><th>Disponível</th><th>Mínimo</th></tr></thead><tbody>${stockRows || '<tr><td colspan="5">Nenhum toner cadastrado.</td></tr>'}</tbody></table></div></section>
        <section class="report-block"><h3>Política de reposição e alertas</h3><p>Alertas automáticos: <b>${Number(data.settings.alert_enabled) ? 'ativos' : 'desativados'}</b>. Avisar com estoque igual ou menor que <b>${data.settings.alert_threshold ?? 2} unidade(s)</b> ou o mínimo definido para o modelo.</p><p>Estoque desejado: <b>${data.settings.replenish_target ?? 5} unidade(s)</b>. Destinos: e-mail ${escapeHtml(data.settings.notify_email || 'não configurado')} · WhatsApp ${escapeHtml(data.settings.notify_whatsapp || 'não configurado')}.</p></section>
        <section class="report-block report-plan"><h3>Planejamento de reposição</h3><p>Consumo médio observado: <b>${average} unidade(s) por mês</b>. Ajuste a quantidade recomendada conforme contratos, prazo de entrega e demanda prevista.</p><label>Quantidade planejada por mês <input id="report-plan-value" type="number" min="0" step="1" value="${suggestion.value}"></label><label>Decisão registrada <textarea id="report-decision-value" rows="3">${escapeHtml(data.settings.decision || '')}</textarea></label></section>
        <section class="report-block report-reading"><h3>Como interpretar</h3><p>Cada unidade representa um toner cuja troca foi registrada no sistema. As barras comparam somente os meses e impressoras selecionados. O estoque mostra as quantidades disponíveis no momento da emissão; o mínimo indica o limite cadastrado para reposição.</p><p><b>Maior fluxo de gasto:</b> ${escapeHtml(formatMonth(peakMonth))}. <b>Recomendação editável:</b> <span id="report-plan-summary">${suggestion.value}</span> unidade(s) por mês.</p><p><b>Decisão:</b> <span id="report-decision-summary">${escapeHtml(data.settings.decision || 'Não informada')}</span></p></section>
        <footer class="report-footer">PrintMonitor · Relatório de consumo de toner · Valores baseados nos registros do sistema</footer></article>`;
    syncRecommendation();
    document.getElementById('report-plan-value').addEventListener('input', () => {
        document.getElementById('report-recommendation').value = document.getElementById('report-plan-value').value;
        syncRecommendation();
    });
    document.getElementById('report-decision-value').addEventListener('input', event => {
        document.getElementById('report-decision-summary').textContent = event.target.value || 'Não informada';
    });
    document.getElementById('edit-report').addEventListener('click', event => {
        const report = document.getElementById('report-document');
        const editing = report.contentEditable !== 'true';
        report.contentEditable = String(editing);
        event.currentTarget.setAttribute('aria-pressed', String(editing));
        event.currentTarget.innerHTML = `<i class="fa-solid fa-pen"></i> ${editing ? 'Concluir edição' : 'Editar conteúdo'}`;
    });
    document.getElementById('print-report').addEventListener('click', () => {
        document.body.classList.add('printing-report');
        window.print();
    });
}

function syncRecommendation() {
    const reportValue = document.getElementById('report-plan-value');
    const summary = document.getElementById('report-plan-summary');
    if (reportValue && summary) {
        reportValue.value = document.getElementById('report-recommendation').value;
        summary.textContent = reportValue.value;
    }
}

function formatMonth(value) {
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function formatDate(value) {
    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
}

function isLowStock(item) {
    const minimum = Math.max(Number(item.min_quantity) || 0, Number(tonerData.settings.alert_threshold) || 0);
    return Number(item.quantity) <= minimum;
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('pt-BR');
}

function localDate() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}