document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('generate-inventory-report').addEventListener('click', generateInventoryReport);
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-inventory-report'));
});

async function generateInventoryReport() {
    const message = document.getElementById('inventory-report-message');
    message.textContent = 'Carregando o cadastro...';
    try {
        const [printersResponse, tonerResponse] = await Promise.all([
            fetch('/api/printers'),
            fetch('/api/toners')
        ]);
        const [printersResult, tonerResult] = await Promise.all([printersResponse.json(), tonerResponse.json()]);
        if (!printersResponse.ok || !printersResult.success) throw new Error(printersResult.message || 'Erro ao carregar impressoras.');
        if (!tonerResponse.ok || !tonerResult.success) throw new Error(tonerResult.message || 'Erro ao carregar estoque de toner.');
        renderInventoryReport(printersResult.data, tonerResult.data.inventory);
        message.textContent = 'Inventário pronto para revisar e imprimir.';
    } catch (error) {
        message.textContent = error.message || 'Não foi possível gerar o inventário.';
    }
}

function renderInventoryReport(printers, inventory) {
    const query = document.getElementById('inventory-report-search').value.trim().toLocaleLowerCase('pt-BR');
    const statusFilter = document.getElementById('inventory-report-status').value;
    const stockFilter = document.getElementById('inventory-report-stock').value;
    const statusPrinters = printers.filter(printer => {
        if (statusFilter === 'no-ip') return !printer.ip;
        return statusFilter === 'all' || printer.status === statusFilter;
    });
    const matchesSearch = value => !query || String(value ?? '').toLocaleLowerCase('pt-BR').includes(query);
    const filteredPrinters = statusPrinters.filter(printer => matchesSearch([
        printer.name, printer.location, printer.ip, printer.manufacturer, printer.model,
        ...(printer.toners || []).flatMap(toner => [toner.color, toner.status, toner.level])
    ].join(' ')));
    const statusPrinterIds = new Set(statusPrinters.map(printer => Number(printer.id)));
    const searchPrinterIds = new Set(filteredPrinters.map(printer => Number(printer.id)));
    const filteredInventory = inventory.filter(item => {
        const isLow = Number(item.quantity) <= Number(item.min_quantity);
        const matchesStock = stockFilter === 'all' || (stockFilter === 'low' ? isLow : !isLow);
        const linkedPrinterIds = item.printerIds || [];
        const matchesStatus = statusFilter === 'all' || linkedPrinterIds.some(id => statusPrinterIds.has(Number(id)));
        const matchesItemSearch = matchesSearch([item.model, item.color, item.printerNames].join(' '));
        const matchesLinkedPrinterSearch = linkedPrinterIds.some(id => searchPrinterIds.has(Number(id)));
        return matchesStock && matchesStatus && (!query || matchesItemSearch || matchesLinkedPrinterSearch);
    });
    const sensorRows = filteredPrinters.flatMap(printer => (printer.toners || []).map(toner => ({ printer, toner })));
    const units = filteredInventory.reduce((sum, item) => sum + Number(item.quantity), 0);
    const lowStock = filteredInventory.filter(item => Number(item.quantity) <= Number(item.min_quantity)).length;
    const printerRows = filteredPrinters.map(printer => `<tr><td>${escapeReportHtml(printer.name)}</td><td>${escapeReportHtml(printer.location || '-')}</td><td>${escapeReportHtml(printer.ip || 'Fora da rede')}</td><td>${escapeReportHtml([printer.manufacturer, printer.model].filter(Boolean).join(' ') || '-')}</td><td>${escapeReportHtml(printer.status || 'offline')}</td><td>${formatReportNumber(printer.pageCount)}</td></tr>`).join('');
    const sensorTonerRows = sensorRows.map(({ printer, toner }) => `<tr><td>${escapeReportHtml(printer.name)}</td><td>${escapeReportHtml(toner.color || '-')}</td><td>${formatReportNumber(toner.level)}%</td><td>${escapeReportHtml(toner.status || '-')}</td></tr>`).join('');
    const stockRows = filteredInventory.map(item => `<tr><td>${escapeReportHtml(item.model)}</td><td>${escapeReportHtml(item.color)}</td><td>${escapeReportHtml(item.printerNames || 'Sem vínculo')}</td><td>${formatReportNumber(item.quantity)}</td><td>${formatReportNumber(item.min_quantity)}</td><td>${Number(item.quantity) <= Number(item.min_quantity) ? 'Reposição' : 'Regular'}</td></tr>`).join('');
    const statusLabel = statusFilter === 'all' ? 'Todos' : statusFilter === 'no-ip' ? 'Sem IP' : statusFilter;
    const stockLabel = stockFilter === 'all' ? 'Todos' : stockFilter === 'low' ? 'No mínimo ou abaixo' : 'Acima do mínimo';
    const searchLabel = query ? ` · busca "${escapeReportHtml(query)}"` : '';
    document.getElementById('inventory-report-preview').innerHTML = `<div class="report-toolbar"><span><i class="fa-solid fa-eye"></i> Prévia do inventário</span><button class="btn btn-primary" type="button" id="print-inventory-report"><i class="fa-solid fa-file-pdf"></i> Imprimir / Salvar PDF</button></div>
        <article class="print-report" id="inventory-report-document"><header class="report-header"><div><p class="eyebrow">PrintMonitor · Inventário</p><h2>Relatório geral de impressoras e toners</h2><p>Gerado em ${escapeReportHtml(new Date().toLocaleString('pt-BR'))}</p><p>Filtros: status ${escapeReportHtml(statusLabel)} · estoque ${escapeReportHtml(stockLabel)}${searchLabel}</p></div></header>
        <section class="inventory-report-metrics"><div><span>Impressoras</span><strong>${filteredPrinters.length}</strong></div><div><span>Offline</span><strong>${filteredPrinters.filter(printer => printer.status !== 'online').length}</strong></div><div><span>Toners monitorados</span><strong>${sensorRows.length}</strong></div><div><span>Itens em estoque</span><strong>${filteredInventory.length}</strong></div><div><span>Unidades em estoque</span><strong>${formatReportNumber(units)}</strong></div><div><span>Para reposição</span><strong>${lowStock}</strong></div></section>
        <section class="report-block"><h3>Impressoras cadastradas</h3><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Impressora</th><th>Localização</th><th>IP</th><th>Fabricante / modelo</th><th>Status</th><th>Impressões</th></tr></thead><tbody>${printerRows || '<tr><td colspan="6">Nenhuma impressora corresponde aos filtros.</td></tr>'}</tbody></table></div></section>
        <section class="report-block"><h3>Níveis de toner monitorados</h3><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Impressora</th><th>Cor / tipo</th><th>Nível</th><th>Status</th></tr></thead><tbody>${sensorTonerRows || '<tr><td colspan="4">Nenhum nível de toner monitorado para os filtros selecionados.</td></tr>'}</tbody></table></div></section>
        <section class="report-block"><h3>Estoque de toner cadastrado</h3><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Modelo</th><th>Cor / tipo</th><th>Impressoras compatíveis</th><th>Disponível</th><th>Mínimo</th><th>Situação</th></tr></thead><tbody>${stockRows || '<tr><td colspan="6">Nenhum item de estoque corresponde aos filtros.</td></tr>'}</tbody></table></div></section>
        <footer class="report-footer">PrintMonitor · Relatório geral do cadastro atual · Impressoras offline e sem IP são incluídas conforme os filtros</footer></article>`;
    document.getElementById('print-inventory-report').addEventListener('click', () => {
        document.body.classList.add('printing-inventory-report');
        window.print();
    });
}

function formatReportNumber(value) {
    return Number(value || 0).toLocaleString('pt-BR');
}

function escapeReportHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}