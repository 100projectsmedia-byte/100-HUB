// lib/adminAuth.js
// Stateless, signed admin session tokens.
//
// Why this exists: verify-pin.js checks a 4-digit PIN just to unlock the
// dashboard UI, but every write endpoint (partners, media-kit, update-member,
// etc.) was accepting requests from ANYONE who found the URL — the PIN
// screen was a UI gate, not a real API guard. This adds a real one.
//
// Flow:
//   1. /api/verify-pin checks the PIN, and on success signs a token
//      (base64 payload + HMAC-SHA256 signature) using ADMIN_SESSION_SECRET.
//   2. The dashboard stores that token in sessionStorage.
//   3. Every write request sends it as `Authorization: Bearer <token>`.
//   4. Each protected endpoint calls requireAdmin(req, res) first, which
//      verifies the signature and expiry — no database/session lookup
//      needed, so it works fine across stateless serverless invocations.
//
// Requires an ADMIN_SESSION_SECRET environment variable in Vercel — pick any
// long random string (e.g. `openssl rand -hex 32`) and set it once.

import crypto from 'crypto';

const TOKEN_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

function base64url(input) {
    return Buffer.from(input).toString('base64url');
}

function sign(payload, secret) {
    return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createAdminToken() {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) {
        throw new Error('ADMIN_SESSION_SECRET is not set');
    }
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const payload = base64url(JSON.stringify({ expiresAt }));
    const signature = sign(payload, secret);
    return `${payload}.${signature}`;
}

export function isValidAdminToken(token) {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!token || !secret) return false;

    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payload, signature] = parts;

    const expectedSignature = sign(payload, secret);
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    // Lengths must match before timingSafeEqual — mismatched lengths throw.
    if (sigBuffer.length !== expectedBuffer.length) return false;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return false;

    try {
        const { expiresAt } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        return typeof expiresAt === 'number' && Date.now() < expiresAt;
    } catch {
        return false;
    }
}

// Call at the top of any write handler. Returns true if the request is
// authorized; if false, it has already written a 401 response and the
// caller should immediately `return`.
export function requireAdmin(req, res) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!isValidAdminToken(token)) {
        res.status(401).json({ error: 'Unauthorized — please unlock the dashboard again.' });
        return false;
    }
    return true;
}