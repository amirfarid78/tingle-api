/**
 * Global error handler middleware
 */
module.exports = (err, req, res, next) => {
    console.error('❌ Error:', err.message);
    console.error(err.stack);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ status: false, message: messages.join(', ') });
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({ status: false, message: `${field} already exists` });
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({ status: false, message: 'Invalid ID format' });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ status: false, message: 'Invalid token' });
    }

    // Default server error
    res.status(err.statusCode || 500).json({
        status: false,
        message: err.message || 'Internal Server Error',
    });
};
