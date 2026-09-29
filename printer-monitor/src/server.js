require('dotenv').config();
const app = require('./app');
const { startPrinterMonitor } = require('./jobs/printerMonitor');
const { startTonerAlerts } = require('./services/tonerNotifications');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    startPrinterMonitor();
    startTonerAlerts();
});