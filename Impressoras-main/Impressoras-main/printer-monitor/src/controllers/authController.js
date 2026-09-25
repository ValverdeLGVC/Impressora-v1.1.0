const bcrypt = require('bcryptjs');
const db = require('../config/database');

function publicUser(user) {
    return { id: user.id, username: user.username, role: user.role };
}

exports.login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Informe usuário e senha.' });

    try {
        const [users] = await db.query('SELECT id, username, password_hash, role FROM users WHERE username = ? AND is_active = 1', [username.trim()]);
        const user = users[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
        }
        req.session.user = publicUser(user);
        res.json({ success: true, user: req.session.user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao realizar login.' });
    }
};

exports.me = (req, res) => res.json({ success: true, user: req.session.user || null });

exports.logout = (req, res) => req.session.destroy(() => res.json({ success: true }));

exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'A nova senha deve ter pelo menos 8 caracteres.' });
    }
    try {
        const [users] = await db.query('SELECT password_hash FROM users WHERE id = ? AND is_active = 1', [req.session.user.id]);
        if (!users[0] || !(await bcrypt.compare(currentPassword, users[0].password_hash))) {
            return res.status(400).json({ success: false, message: 'Senha atual inválida.' });
        }
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.session.user.id]);
        res.json({ success: true, message: 'Senha alterada com sucesso.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao alterar senha.' });
    }
};