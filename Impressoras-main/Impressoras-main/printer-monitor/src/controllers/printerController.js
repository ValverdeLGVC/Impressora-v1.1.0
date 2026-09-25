const db = require('../config/database');
const SnmpService = require('../services/snmpService');

exports.getAllPrinters = async (req, res) => {
    try {
        const [printers] = await db.query(`
                 SELECT p.id, p.name, p.location, p.ip_address as ip, p.status, p.last_checked, p.page_count, p.manufacturer, p.model,
                   t.color, t.current_level, t.status as toner_status
            FROM printers p
            LEFT JOIN toners t ON p.id = t.printer_id
        `);

        const formattedPrinters = printers.reduce((acc, row) => {
            let printer = acc.find(p => p.id === row.id);
            if (!printer) {
                printer = {
                    id: row.id, name: row.name, location: row.location, ip: row.ip,
                    status: row.status, manufacturer: row.manufacturer, model: row.model,
                    pageCount: row.page_count, toners: []
                };
                acc.push(printer);
            }
            if (row.color) {
                printer.toners.push({ color: row.color, level: row.current_level, status: row.toner_status });
            }
            return acc;
        }, []);

        res.json({ success: true, data: formattedPrinters });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao buscar impressoras' });
    }
};

exports.testSnmp = async (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ success: false, message: 'IP não fornecido' });

    // Testa a comunicação SNMP
    const result = await SnmpService.testConnection(ip);
    if (result.success) {
        res.json({ success: true, message: 'Comunicação estabelecida com sucesso!', details: result.data });
    } else {
        res.json({ success: false, message: 'Falha na comunicação SNMP. Verifique o IP ou se a impressora está ligada.' });
    }
};

exports.createPrinter = async (req, res) => {
    const { name, location, ip, manufacturer, model } = req.body;
    try {
        const connection = await SnmpService.testConnection(ip);
        const status = connection.success ? 'online' : 'offline';

        const [result] = await db.query(
            'INSERT INTO printers (name, location, ip_address, manufacturer, model, status, last_checked) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [name, location, ip, manufacturer, model, status]
        );
        res.json({
            success: true,
            message: 'Impressora cadastrada!',
            id: result.insertId,
            status
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Este IP já está cadastrado.' });
        }
        res.status(500).json({ success: false, message: 'Erro ao salvar impressora' });
    }
};

exports.updatePrinter = async (req, res) => {
    const printerId = Number(req.params.id);
    const name = String(req.body.name || '').trim();
    const location = String(req.body.location || '').trim();
    if (!Number.isInteger(printerId) || printerId < 1 || !name || name.length > 100 || location.length > 100) {
        return res.status(400).json({ success: false, message: 'Informe um nome válido e uma localização de até 100 caracteres.' });
    }
    try {
        const [printers] = await db.query('SELECT id FROM printers WHERE id = ?', [printerId]);
        if (!printers.length) return res.status(404).json({ success: false, message: 'Impressora não encontrada.' });
        await db.query('UPDATE printers SET name = ?, location = ? WHERE id = ?', [name, location || null, printerId]);
        res.json({ success: true, message: 'Impressora atualizada.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao atualizar a impressora.' });
    }
};

exports.deletePrinter = async (req, res) => {
    try {
        await db.query('DELETE FROM printers WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Impressora removida' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao remover' });
    }
};