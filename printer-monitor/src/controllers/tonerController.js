const db = require('../config/database');

const allowedTreatments = new Set(['none', 'Sr.', 'Sra.', 'Srta.', 'Dr.', 'Dra.']);

function validId(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

function validQuantity(value, allowZero = false) {
    return Number.isInteger(Number(value)) && Number(value) >= (allowZero ? 0 : 1);
}

async function inventoryRows() {
    const [items] = await db.query(`
        SELECT i.id, i.model, i.color, i.quantity, i.min_quantity, i.created_at, i.updated_at,
               GROUP_CONCAT(DISTINCT p.id ORDER BY p.id) AS printer_ids,
               GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') AS printer_names
        FROM toner_inventory i
        LEFT JOIN toner_inventory_printers ip ON ip.inventory_id = i.id
        LEFT JOIN printers p ON p.id = ip.printer_id
        GROUP BY i.id
        ORDER BY i.model, i.color
    `);
    return items.map(item => ({
        ...item,
        printerIds: item.printer_ids ? item.printer_ids.split(',').map(Number) : [],
        printerNames: item.printer_names || 'Sem impressora vinculada'
    }));
}

exports.getOverview = async (req, res) => {
    try {
        const [inventory, [printers], [settings]] = await Promise.all([
            inventoryRows(),
            db.query('SELECT id, name FROM printers WHERE is_active = 1 OR is_active IS NULL ORDER BY name'),
            db.query('SELECT alert_enabled, alert_threshold, replenish_target, notify_email, notify_whatsapp, decision FROM toner_settings WHERE id = 1')
        ]);
        const [usage] = await db.query(`
            SELECT u.id, u.inventory_id AS inventoryId, u.model_snapshot AS model,
                   u.color_snapshot AS color, u.printer_id AS printerId,
                   u.printer_name_snapshot AS printerName, u.quantity,
                   DATE_FORMAT(u.used_at, '%Y-%m-%d') AS usedAt, u.notes
            FROM toner_usage u ORDER BY u.used_at DESC, u.id DESC LIMIT 300
        `);
        res.json({
            success: true,
            data: {
                inventory,
                printers,
                settings: settings[0] || {},
                usage,
                notificationChannels: {
                    email: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
                    whatsapp: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
                    whatsappTemplate: Boolean(process.env.WHATSAPP_TEMPLATE_NAME)
                }
            }
        });
    } catch (error) {
        console.error('Erro ao buscar estoque de toner:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao carregar estoque de toner.' });
    }
};

exports.createInventory = async (req, res) => {
    const { model, color, quantity, minQuantity, printerIds } = req.body;
    const linkedPrinters = Array.isArray(printerIds) ? [...new Set(printerIds.map(Number))] : [];
    if (!model?.trim() || !color?.trim() || !validQuantity(quantity, true) || !validQuantity(minQuantity, true) || !linkedPrinters.length || linkedPrinters.some(id => !validId(id))) {
        return res.status(400).json({ success: false, message: 'Informe modelo, cor, quantidades válidas e ao menos uma impressora.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query('INSERT INTO toner_inventory (model, color, quantity, min_quantity) VALUES (?, ?, ?, ?)', [model.trim(), color.trim(), Number(quantity), Number(minQuantity)]);
        for (const printerId of linkedPrinters) {
            await connection.query('INSERT INTO toner_inventory_printers (inventory_id, printer_id) VALUES (?, ?)', [result.insertId, printerId]);
        }
        await connection.commit();
        res.status(201).json({ success: true, message: 'Toner cadastrado no estoque.', id: result.insertId });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao cadastrar toner:', error.message);
        res.status(400).json({ success: false, message: 'Não foi possível cadastrar o toner. Verifique as impressoras selecionadas.' });
    } finally {
        connection.release();
    }
};

exports.updateInventory = async (req, res) => {
    const { model, color, quantity, minQuantity, printerIds } = req.body;
    const linkedPrinters = Array.isArray(printerIds) ? [...new Set(printerIds.map(Number))] : [];
    if (!validId(req.params.id) || !model?.trim() || !color?.trim() || !validQuantity(quantity, true) || !validQuantity(minQuantity, true) || !linkedPrinters.length || linkedPrinters.some(id => !validId(id))) {
        return res.status(400).json({ success: false, message: 'Dados do estoque inválidos.' });
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query('UPDATE toner_inventory SET model = ?, color = ?, quantity = ?, min_quantity = ? WHERE id = ?', [model.trim(), color.trim(), Number(quantity), Number(minQuantity), req.params.id]);
        if (!result.affectedRows) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Toner não encontrado.' });
        }
        await connection.query('DELETE FROM toner_inventory_printers WHERE inventory_id = ?', [req.params.id]);
        for (const printerId of linkedPrinters) {
            await connection.query('INSERT INTO toner_inventory_printers (inventory_id, printer_id) VALUES (?, ?)', [req.params.id, printerId]);
        }
        await connection.commit();
        res.json({ success: true, message: 'Estoque atualizado.' });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ success: false, message: 'Não foi possível atualizar o estoque.' });
    } finally {
        connection.release();
    }
};

exports.deleteInventory = async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Toner inválido.' });
    try {
        await db.query('DELETE FROM toner_inventory WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Toner removido do estoque. O histórico de consumo foi preservado.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao remover toner do estoque.' });
    }
};

exports.recordUsage = async (req, res) => {
    const { inventoryId, printerId, quantity = 1, usedAt, notes = '' } = req.body;
    if (!validId(inventoryId) || !validId(printerId) || !validQuantity(quantity) || (usedAt && !/^\d{4}-\d{2}-\d{2}$/.test(usedAt))) {
        return res.status(400).json({ success: false, message: 'Informe toner, impressora, quantidade e data válidos.' });
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query(`
            SELECT i.model, i.color, i.quantity, p.name AS printer_name
            FROM toner_inventory i
            JOIN toner_inventory_printers ip ON ip.inventory_id = i.id AND ip.printer_id = ?
            JOIN printers p ON p.id = ip.printer_id
            WHERE i.id = ? FOR UPDATE
        `, [printerId, inventoryId]);
        const item = rows[0];
        if (!item) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Este toner não está vinculado à impressora selecionada.' });
        }
        if (item.quantity < Number(quantity)) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `Estoque insuficiente. Disponível: ${item.quantity}.` });
        }
        await connection.query('UPDATE toner_inventory SET quantity = quantity - ? WHERE id = ?', [Number(quantity), inventoryId]);
        await connection.query(`
            INSERT INTO toner_usage (inventory_id, model_snapshot, color_snapshot, printer_id, printer_name_snapshot, quantity, used_at, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURDATE()), ?, ?)
        `, [inventoryId, item.model, item.color, printerId, item.printer_name, Number(quantity), usedAt || null, String(notes).trim().slice(0, 500), req.session.user.username]);
        await connection.commit();
        res.status(201).json({ success: true, message: 'Troca de toner registrada e estoque atualizado.' });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao registrar troca de toner:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao registrar troca de toner.' });
    } finally {
        connection.release();
    }
};

exports.deleteUsage = async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Registro de troca inválido.' });
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT inventory_id, quantity FROM toner_usage WHERE id = ? FOR UPDATE', [req.params.id]);
        const usage = rows[0];
        if (!usage) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Registro de troca não encontrado.' });
        }
        if (usage.inventory_id) {
            await connection.query('UPDATE toner_inventory SET quantity = quantity + ? WHERE id = ?', [usage.quantity, usage.inventory_id]);
        }
        await connection.query('DELETE FROM toner_usage WHERE id = ?', [req.params.id]);
        await connection.commit();
        res.json({ success: true, message: 'Troca excluída e quantidade devolvida ao estoque.' });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao excluir troca de toner:', error.message);
        res.status(500).json({ success: false, message: 'Não foi possível excluir a troca.' });
    } finally {
        connection.release();
    }
};

exports.updateSettings = async (req, res) => {
    const { alertEnabled, alertThreshold, replenishTarget, notifyEmail, notifyWhatsapp, decision } = req.body;
    if (typeof alertEnabled !== 'boolean' || !validQuantity(alertThreshold, true) || !validQuantity(replenishTarget, true) || (notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail))) {
        return res.status(400).json({ success: false, message: 'Revise os limites e os dados de notificação.' });
    }
    try {
        await db.query(`
            INSERT INTO toner_settings (id, alert_enabled, alert_threshold, replenish_target, notify_email, notify_whatsapp, decision)
            VALUES (1, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE alert_enabled = VALUES(alert_enabled), alert_threshold = VALUES(alert_threshold),
                replenish_target = VALUES(replenish_target), notify_email = VALUES(notify_email),
                notify_whatsapp = VALUES(notify_whatsapp), decision = VALUES(decision)
        `, [alertEnabled ? 1 : 0, Number(alertThreshold), Number(replenishTarget), notifyEmail?.trim() || null, notifyWhatsapp?.trim() || null, String(decision || '').trim().slice(0, 2000)]);
        res.json({ success: true, message: 'Preferências de estoque salvas.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao salvar as preferências.' });
    }
};

exports.getReportData = async (req, res) => {
    const { months, printerIds } = req.query;
    const monthList = String(months || '').split(',').filter(month => /^\d{4}-\d{2}$/.test(month)).slice(0, 5);
    if (!monthList.length) return res.status(400).json({ success: false, message: 'Selecione ao menos um mês válido.' });
    const printerList = String(printerIds || '').split(',').filter(validId).map(Number);
    const firstMonth = `${monthList.slice().sort()[0]}-01`;
    const lastMonth = `${monthList.slice().sort().at(-1)}-01`;
    const printerSql = printerList.length ? ` AND printer_id IN (${printerList.map(() => '?').join(',')})` : '';
    try {
        const [usage] = await db.query(`
            SELECT DATE_FORMAT(used_at, '%Y-%m') AS month, printer_id AS printerId,
                   printer_name_snapshot AS printerName, model_snapshot AS model,
                   color_snapshot AS color, SUM(quantity) AS quantity
            FROM toner_usage
                        WHERE used_at >= ? AND used_at < DATE_ADD(?, INTERVAL 1 MONTH)
                            AND DATE_FORMAT(used_at, '%Y-%m') IN (${monthList.map(() => '?').join(',')})${printerSql}
            GROUP BY DATE_FORMAT(used_at, '%Y-%m'), printer_id, printer_name_snapshot, model_snapshot, color_snapshot
            ORDER BY month, printerName, model
        `, [firstMonth, lastMonth, ...monthList, ...printerList]);
        const [inventory] = await db.query(`
            SELECT i.model, i.color, i.quantity, i.min_quantity,
                   GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') AS printerNames
            FROM toner_inventory i
            LEFT JOIN toner_inventory_printers ip ON ip.inventory_id = i.id
            LEFT JOIN printers p ON p.id = ip.printer_id
            GROUP BY i.id ORDER BY i.model
        `);
        const [settings] = await db.query('SELECT decision, alert_enabled, alert_threshold, replenish_target, notify_email, notify_whatsapp FROM toner_settings WHERE id = 1');
        res.json({ success: true, data: { months: monthList, usage, inventory, settings: settings[0] || {} } });
    } catch (error) {
        console.error('Erro ao gerar dados de relatório:', error.message);
        res.status(500).json({ success: false, message: 'Não foi possível montar o relatório.' });
    }
};

exports.getWhatsappContacts = async (req, res) => {
    try {
        const [contacts] = await db.query('SELECT id, name, phone_number AS phone, treatment FROM whatsapp_contacts ORDER BY name');
        res.json({ success: true, data: contacts });
    } catch (error) {
        console.error('Erro ao carregar contatos de WhatsApp:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao carregar os contatos.' });
    }
};

exports.createWhatsappContact = async (req, res) => {
    const { name, phone, treatment = 'none' } = req.body;
    const normalizedPhone = String(phone || '').replace(/\D/g, '');
    if (!name?.trim() || name.trim().length > 100 || normalizedPhone.length < 8 || normalizedPhone.length > 15 || !allowedTreatments.has(treatment)) {
        return res.status(400).json({ success: false, message: 'Informe nome, telefone com código do país e tratamento válidos.' });
    }
    try {
        const [result] = await db.query('INSERT INTO whatsapp_contacts (name, phone_number, treatment) VALUES (?, ?, ?)', [name.trim(), normalizedPhone, treatment]);
        res.status(201).json({ success: true, message: 'Contato cadastrado.', id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Este número já está cadastrado.' });
        console.error('Erro ao cadastrar contato de WhatsApp:', error.message);
        res.status(500).json({ success: false, message: 'Não foi possível cadastrar o contato.' });
    }
};

exports.updateWhatsappContact = async (req, res) => {
    const { name, phone, treatment } = req.body;
    const normalizedPhone = String(phone || '').replace(/\D/g, '');
    if (!validId(req.params.id) || !name?.trim() || name.trim().length > 100 || normalizedPhone.length < 8 || normalizedPhone.length > 15 || !allowedTreatments.has(treatment)) {
        return res.status(400).json({ success: false, message: 'Revise nome, telefone e tratamento.' });
    }
    try {
        const [result] = await db.query('UPDATE whatsapp_contacts SET name = ?, phone_number = ?, treatment = ? WHERE id = ?', [name.trim(), normalizedPhone, treatment, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Contato não encontrado.' });
        res.json({ success: true, message: 'Contato atualizado.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Este número já está cadastrado.' });
        res.status(500).json({ success: false, message: 'Não foi possível atualizar o contato.' });
    }
};

exports.deleteWhatsappContact = async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Contato inválido.' });
    try {
        const [result] = await db.query('DELETE FROM whatsapp_contacts WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Contato não encontrado.' });
        res.json({ success: true, message: 'Contato removido.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Não foi possível remover o contato.' });
    }
};

exports.sendWhatsappMessage = async (req, res) => {
    const { contactId, type } = req.body;
    if (!validId(contactId) || !['standard', 'replenishment'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Selecione um contato e um tipo de mensagem válido.' });
    }
    try {
        const [[contact]] = await db.query('SELECT id, name, phone_number AS phone, treatment FROM whatsapp_contacts WHERE id = ?', [contactId]);
        if (!contact) return res.status(404).json({ success: false, message: 'Contato não encontrado.' });

        const greeting = contact.treatment === 'none' ? contact.name : `${contact.treatment} ${contact.name}`;
        let message = `Olá, ${greeting}! Esta é uma mensagem padrão do PrintMonitor. Estamos à disposição para ajudar.`;

        if (type === 'replenishment') {
            const [[settings]] = await db.query('SELECT alert_threshold, replenish_target FROM toner_settings WHERE id = 1');
            const [items] = await db.query(`
                SELECT i.model, i.color, i.quantity,
                       GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') AS printer_names
                FROM toner_inventory i
                LEFT JOIN toner_inventory_printers ip ON ip.inventory_id = i.id
                LEFT JOIN printers p ON p.id = ip.printer_id
                WHERE i.quantity <= GREATEST(i.min_quantity, ?)
                GROUP BY i.id ORDER BY i.quantity, i.model
            `, [Number(settings?.alert_threshold ?? 2)]);
            if (!items.length) return res.status(400).json({ success: false, message: 'Nenhum toner está abaixo do limite de reposição.' });

            const target = Number(settings?.replenish_target ?? 5);
            const itemLines = items.map(item => `- Modelo ${item.model} (${item.color}): estoque ${item.quantity}; solicitar ${Math.max(1, target - Number(item.quantity))} unidade(s) para ${item.printer_names || 'impressoras não vinculadas'}`).join('\n');
            message = `Olá, ${greeting}! Solicitamos a reposição dos toners abaixo:\n${itemLines}\n\nEstoque desejado: ${target} unidade(s) por modelo.`;
        }

        const phone = String(contact.phone).replace(/\D/g, '');
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        res.json({ success: true, message: 'Conversa pronta para abrir no WhatsApp.', url });
    } catch (error) {
        console.error('Erro ao preparar mensagem pelo WhatsApp:', error.message);
        res.status(500).json({ success: false, message: 'Não foi possível preparar a mensagem.' });
    }
};