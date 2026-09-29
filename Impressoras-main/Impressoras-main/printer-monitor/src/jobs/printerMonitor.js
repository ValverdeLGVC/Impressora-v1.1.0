const db = require('../config/database');
const SnmpService = require('../services/snmpService');

let running = false;

async function checkPrinters() {
    if (running) return;
    running = true;

    try {
        const [printers] = await db.query(
            'SELECT id, ip_address, snmp_port, snmp_version, snmp_community FROM printers WHERE is_active = 1 OR is_active IS NULL'
        );

        await Promise.all(printers.map(async (printer) => {
            const options = { port: printer.snmp_port, version: printer.snmp_version, community: printer.snmp_community };
            try {
                const connection = await SnmpService.testConnection(printer.ip_address, options);
                if (!connection.success) throw new Error(connection.error || connection.message);

                await db.query('UPDATE printers SET status = ?, last_checked = NOW() WHERE id = ?', ['online', printer.id]);

                let data;
                try {
                    data = await SnmpService.readPrinterData(printer.ip_address, options);
                    if (data.pageCount !== null) {
                        await db.query('UPDATE printers SET page_count = ? WHERE id = ?', [data.pageCount, printer.id]);
                    }
                } catch (error) {
                    console.warn(`Printer-MIB indisponível para ${printer.ip_address}:`, error.message);
                    return;
                }

                for (const toner of data.toners) {
                    const [existing] = await db.query('SELECT id FROM toners WHERE printer_id = ? AND color = ?', [printer.id, toner.color]);
                    if (existing.length) {
                        await db.query('UPDATE toners SET current_level = ?, max_capacity = ?, status = ?, updated_at = NOW() WHERE id = ?', [toner.level, toner.capacity, toner.level <= 10 ? 'critical' : toner.level <= 30 ? 'warning' : 'normal', existing[0].id]);
                    } else {
                        await db.query('INSERT INTO toners (printer_id, color, current_level, max_capacity, status, updated_at) VALUES (?, ?, ?, ?, ?, NOW())', [printer.id, toner.color, toner.level, toner.capacity, toner.level <= 10 ? 'critical' : toner.level <= 30 ? 'warning' : 'normal']);
                    }
                }
            } catch (error) {
                await db.query('UPDATE printers SET status = ?, last_checked = NOW() WHERE id = ?', ['offline', printer.id]);
            }
        }));
    } catch (error) {
        console.error('Erro ao monitorar impressoras:', error.message);
    } finally {
        running = false;
    }
}

function startPrinterMonitor(interval = 30000) {
    checkPrinters();
    return setInterval(checkPrinters, interval);
}

module.exports = { checkPrinters, startPrinterMonitor };