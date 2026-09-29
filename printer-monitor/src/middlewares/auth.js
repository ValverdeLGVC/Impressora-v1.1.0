function requireAuth(req, res, next) {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
    next();
}

function requireMaster(req, res, next) {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
    if (req.session.user.role !== 'master') return res.status(403).json({ success: false, message: 'Acesso restrito ao usuário master.' });
    next();
}

module.exports = { requireAuth, requireMaster };