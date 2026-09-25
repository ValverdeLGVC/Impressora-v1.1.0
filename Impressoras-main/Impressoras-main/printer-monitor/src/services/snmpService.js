const snmp = require('net-snmp');

class SnmpService {
    /**
     * Testa a comunicação SNMP com a impressora.
     * Retorna um objeto indicando sucesso e os dados básicos (sysDescr).
     */
    static createSession(ip, options = {}) {
        const version = String(options.version || process.env.SNMP_DEFAULT_VERSION || '2c');

        return snmp.createSession(ip, options.community || process.env.SNMP_COMMUNITY || 'public', {
            port: Number(options.port || process.env.SNMP_DEFAULT_PORT) || 161,
            version: version === '1' ? snmp.Version1 : snmp.Version2c,
            timeout: 2000,
            retries: 1
        });
    }

    static async testConnection(ip, options = {}) {
        return new Promise((resolve) => {
            const session = this.createSession(ip, options);
            const oids = ["1.3.6.1.2.1.1.1.0"]; // OID padrão para System Description

            session.get(oids, (error, varbinds) => {
                if (error) {
                    session.close();
                    return resolve({ success: false, message: 'Sem comunicação SNMP', error: error.message });
                }

                let sysDescr = '';
                if (snmp.isVarbindError(varbinds[0])) {
                    const message = snmp.varbindError(varbinds[0]);
                    session.close();
                    return resolve({ success: false, message: 'Resposta SNMP inválida', error: message });
                } else {
                    sysDescr = varbinds[0].value.toString();
                }

                session.close();
                resolve({ success: true, message: 'Comunicacão estabelecida', data: sysDescr });
            });
        });
    }

    static walk(session, oid) {
        return new Promise((resolve, reject) => {
            const values = [];
            session.subtree(oid, (varbinds) => {
                varbinds.forEach((varbind) => {
                    if (!snmp.isVarbindError(varbind)) values.push(varbind);
                });
            }, (error) => error ? reject(error) : resolve(values));
        });
    }

    static async readPrinterData(ip, options = {}) {
        const session = this.createSession(ip, options);
        const suppliesBase = '1.3.6.1.2.1.43.11.1.1';
        const descriptions = await this.walk(session, `${suppliesBase}.6`);
        const capacities = await this.walk(session, `${suppliesBase}.8`);
        const levels = await this.walk(session, `${suppliesBase}.9`);
        const pageCounters = await this.walk(session, '1.3.6.1.2.1.43.10.2.1.4');
        session.close();

        const byIndex = new Map();
        descriptions.forEach((item) => {
            const index = item.oid.split('.').pop();
            byIndex.set(index, { color: String(item.value), level: null, capacity: null });
        });
        capacities.forEach((item) => {
            const toner = byIndex.get(item.oid.split('.').pop());
            if (toner) toner.capacity = Number(item.value);
        });
        levels.forEach((item) => {
            const toner = byIndex.get(item.oid.split('.').pop());
            if (toner) toner.level = Number(item.value);
        });

        const toners = [...byIndex.values()]
            .filter((toner) => toner.level !== null && toner.capacity > 0)
            .map((toner) => ({ ...toner, level: Math.max(0, Math.min(100, Math.round(toner.level / toner.capacity * 100))) }));
        const pageCount = pageCounters.reduce((total, item) => Math.max(total, Number(item.value) || 0), 0) || null;

        return { toners, pageCount };
    }
}

module.exports = SnmpService;