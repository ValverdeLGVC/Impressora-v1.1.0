const bcrypt = require('bcryptjs');
const db = require('../config/database');

exports.list = async (req, res) => {
    const [users] = await db.query('SELECT id, username, role, is_active, created_at FROM users ORDER BY username');
    res.json({ success: true, data: users });
};

exports.create = async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || password.length < 8 || !['master', 'viewer'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Usuário, nível válido e senha de pelo menos 8 caracteres são obrigatórios.' });
    }
    try {
        const hash = await bcrypt.hash(password, 12);
        const [result] = await db.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username.trim(), hash, role]);
        res.status(201).json({ success: true, id: result.insertId, message: 'Usuário cadastrado.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Este usuário já existe.' });
        res.status(500).json({ success: false, message: 'Erro ao cadastrar usuário.' });
    }
};

exports.update = async (req, res) => {
    const { role, isActive } = req.body;
    const username = String(req.body.username || '').trim();
    if (!['master', 'viewer'].includes(role) || typeof isActive !== 'boolean' || !username || username.length > 100) {
        return res.status(400).json({ success: false, message: 'Nome, nível ou status inválido.' });
    }
    if (Number(req.params.id) === req.session.user.id && (!isActive || role !== 'master')) {
        return res.status(400).json({ success: false, message: 'O usuário master atual não pode remover o próprio acesso.' });
    }
    try {
        const [users] = await db.query('SELECT id, role, is_active FROM users WHERE id = ?', [req.params.id]);
        if (!users[0]) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        if (users[0].role === 'master' && users[0].is_active && (role !== 'master' || !isActive)) {
            const [[{ activeMasters }]] = await db.query("SELECT COUNT(*) AS activeMasters FROM users WHERE role = 'master' AND is_active = 1");
            if (activeMasters <= 1) return res.status(400).json({ success: false, message: 'Mantenha ao menos um usuário master ativo no sistema.' });
        }
        await db.query('UPDATE users SET username = ?, role = ?, is_active = ? WHERE id = ?', [username, role, isActive ? 1 : 0, req.params.id]);
        if (Number(req.params.id) === req.session.user.id) req.session.user.username = username;
        res.json({ success: true, message: 'Usuário atualizado.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Este usuário já existe.' });
        res.status(500).json({ success: false, message: 'Erro ao atualizar usuário.' });
    }
};

exports.remove = async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ success: false, message: 'Usuário inválido.' });
    if (userId === req.session.user.id) return res.status(400).json({ success: false, message: 'Você não pode apagar o próprio usuário.' });
    try {
        const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [userId]);
        if (!users[0]) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        if (users[0].role === 'master') {
            return res.status(400).json({ success: false, message: 'Para apagar este usuário, altere primeiro o nível de acesso para Visualizador.' });
        }
        await db.query('DELETE FROM users WHERE id = ?', [userId]);
        res.json({ success: true, message: 'Usuário apagado.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao apagar usuário.' });
    }
};