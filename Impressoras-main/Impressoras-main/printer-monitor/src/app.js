const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const printerRoutes = require('./routes/printerRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tonerRoutes = require('./routes/tonerRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(session({
	secret: process.env.SESSION_SECRET || 'troque-esta-chave-no-ambiente',
	resave: false,
	saveUninitialized: false,
	cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 8 * 60 * 60 * 1000 }
}));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../public')));

// Rotas da API
app.use('/api/printers', printerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/toners', tonerRoutes);

module.exports = app;