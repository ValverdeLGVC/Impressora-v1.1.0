const db = require('../config/database');

async function sendEmail(to, subject, text) {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !to) return false;
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [to], subject, text })
    });
    if (!response.ok) throw new Error(`Resend retornou HTTP ${response.status}`);
    return true;
}

async function sendWhatsApp(to, text) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId || !to) return false;
    const version = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
    const payload = templateName
        ? { messaging_product: 'whatsapp', to: to.replace(/\D/g, ''), type: 'template', template: { name: templateName, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'pt_BR' }, components: [{ type: 'body', parameters: [{ type: 'text', text }] }] } }
        : { messaging_product: 'whatsapp', to: to.replace(/\D/g, ''), type: 'text', text: { body: text } };
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`WhatsApp Cloud retornou HTTP ${response.status}`);
    return true;
}

async function checkLowStock() {
    try {
        const [[settings]] = await db.query('SELECT * FROM toner_settings WHERE id = 1');
        if (!settings || !settings.alert_enabled) return;
        const [[sentToday]] = await db.query('SELECT alert_date FROM toner_alert_log WHERE alert_date = CURDATE()');
        if (sentToday) return;

        const [items] = await db.query(`
            SELECT i.model, i.color, i.quantity,
                   GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') AS printer_names
            FROM toner_inventory i
            LEFT JOIN toner_inventory_printers ip ON ip.inventory_id = i.id
            LEFT JOIN printers p ON p.id = ip.printer_id
            WHERE i.quantity <= GREATEST(i.min_quantity, ?)
            GROUP BY i.id ORDER BY i.quantity, i.model
        `, [settings.alert_threshold]);
        if (!items.length) return;

        const itemLines = items.map(item => `- ${item.model} (${item.color}): ${item.quantity} em estoque; impressoras: ${item.printer_names || 'não vinculadas'}`).join('\n');
        const text = `Toners chegando ao fim:\n${itemLines}\n\nCaso ainda não tenha cotado, recomendamos realizar a cotação imediatamente. Estoque desejado: ${settings.replenish_target} unidade(s).`;
        const sendResults = await Promise.allSettled([
            sendEmail(settings.notify_email, 'PrintMonitor: toner chegando ao fim', text),
            sendWhatsApp(settings.notify_whatsapp, text)
        ]);
        const delivered = sendResults.some(result => result.status === 'fulfilled' && result.value);
        if (delivered) {
            await db.query('INSERT IGNORE INTO toner_alert_log (alert_date) VALUES (CURDATE())');
            sendResults.filter(result => result.status === 'rejected').forEach(result => console.error('Falha ao enviar alerta de toner:', result.reason.message));
        } else {
            console.warn('Alerta de estoque ativo, mas nenhum canal de envio está configurado ou disponível.');
        }
    } catch (error) {
        console.error('Erro ao verificar alertas de estoque:', error.message);
    }
}

function startTonerAlerts(interval = 60 * 60 * 1000) {
    checkLowStock();
    return setInterval(checkLowStock, interval);
}

module.exports = { checkLowStock, startTonerAlerts };