const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account-key.json';
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('✅ Firebase Admin initialized');
} catch (err) {
    console.warn('⚠️ Firebase Admin not initialized - using dev mode (skipping token verification)');
}

/**
 * Auth middleware - verifies Firebase ID token
 * Sets req.uid, req.firebaseUser on success
 */
const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const uid = req.headers['x-user-uid'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ status: false, message: 'No token provided' });
        }

        const token = authHeader.split('Bearer ')[1];

        // In dev mode, skip Firebase verification if not initialized
        if (!admin.apps.length) {
            req.uid = uid || 'dev_user';
            req.token = token;
            return next();
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        req.uid = decodedToken.uid;
        req.firebaseUser = decodedToken;
        req.token = token;
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        return res.status(401).json({ status: false, message: 'Invalid or expired token' });
    }
};

/**
 * Optional auth - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split('Bearer ')[1];
            if (admin.apps.length) {
                const decodedToken = await admin.auth().verifyIdToken(token);
                req.uid = decodedToken.uid;
                req.firebaseUser = decodedToken;
            } else {
                req.uid = req.headers['x-user-uid'] || null;
            }
            req.token = token;
        }
    } catch (e) {
        // Ignore - optional
    }
    next();
};

module.exports = { auth, optionalAuth };
