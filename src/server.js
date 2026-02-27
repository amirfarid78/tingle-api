require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { initSocket } = require('./socket/socketManager');

const app = express();
const server = http.createServer(app);

// ─── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Admin Panel (EJS) ─────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Session for admin panel
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'tingle_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
};

if (process.env.USE_IN_MEMORY_DB !== 'true') {
    sessionConfig.store = MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
    });
}

app.use(session(sessionConfig));

// ─── API Routes ─────────────────────────────────────────
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/posts', require('./routes/post.routes'));
app.use('/api/videos', require('./routes/video.routes'));
app.use('/api/songs', require('./routes/song.routes'));
app.use('/api/hashtags', require('./routes/hashtag.routes'));
app.use('/api/messages', require('./routes/message.routes'));
app.use('/api/connections', require('./routes/connection.routes'));
app.use('/api/friends', require('./routes/friend.routes'));
app.use('/api/coins', require('./routes/coin.routes'));
app.use('/api/store', require('./routes/store.routes'));
app.use('/api/backpack', require('./routes/backpack.routes'));
app.use('/api/gifts', require('./routes/gift.routes'));
app.use('/api/emojis', require('./routes/emoji.routes'));
app.use('/api/rankings', require('./routes/ranking.routes'));
app.use('/api/search', require('./routes/search.routes'));
app.use('/api/report', require('./routes/report.routes'));
app.use('/api/help', require('./routes/help.routes'));
app.use('/api/agora', require('./routes/agora.routes'));

// ─── Admin Routes ───────────────────────────────────────
app.use('/admin', require('./routes/admin.routes'));

// ─── Health Check ───────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: true, message: 'Tingle Backend API is running' });
});

// ─── Error Handler ──────────────────────────────────────
app.use(require('./middleware/errorHandler'));

// ─── Connect DB & Start ─────────────────────────────────
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        let mongoUri = process.env.MONGODB_URI;
        if (process.env.USE_IN_MEMORY_DB === 'true') {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongoServer = await MongoMemoryServer.create();
            mongoUri = mongoServer.getUri();
            console.log(`✅ Using In-Memory MongoDB at ${mongoUri}`);
        }

        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB Connected');

        if (process.env.USE_IN_MEMORY_DB === 'true') {
            const seedData = require('./seeds/seedLogic');
            await seedData();
        }

        // Initialize Socket.io
        initSocket(server);

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
            console.log(`📡 API base: http://localhost:${PORT}/api`);
        });
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    }
}
startServer();

module.exports = app;
