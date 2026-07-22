// api/verify-pin.js
// Verifies dashboard PIN from Supabase
// NOTE: This must live at /api/verify-pin.js at the project ROOT for Vercel
// to pick it up automatically — not in /functions/api/ (that's the old
// Cloudflare Pages Functions convention and Vercel will silently 404 it).

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { pin } = req.body || {};

        if (!pin) {
            return res.status(400).json({ error: 'PIN is required' });
        }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

        // Get the PIN from settings
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'dashboard_pin')
            .single();

        if (error) {
            console.error('Supabase fetch error:', error);
            // Fallback to default if not found
            const isCorrect = pin === '3689';
            return res.status(200).json({
                success: isCorrect,
                error: isCorrect ? null : 'Invalid PIN'
            });
        }

        const isCorrect = pin === data.value;

        return res.status(200).json({
            success: isCorrect,
            error: isCorrect ? null : 'Invalid PIN'
        });
    } catch (error) {
        console.error('Verify PIN error:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
}
