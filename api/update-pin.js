// api/update-pin.js
// Updates the dashboard PIN in Supabase
// NOTE: This must live at /api/update-pin.js at the project ROOT for Vercel
// to pick it up automatically — not in /functions/api/ (old Cloudflare
// Pages Functions convention, which Vercel does not recognize).

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../lib/adminAuth.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST' && req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!requireAdmin(req, res)) return;

    try {
        const { currentPin, newPin } = req.body || {};

        if (!currentPin || !newPin) {
            return res.status(400).json({ error: 'Current PIN and new PIN are required' });
        }

        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
        }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

        // Get current PIN
        const { data: currentData, error: fetchError } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'dashboard_pin')
            .single();

        if (fetchError) {
            console.error('Fetch error:', fetchError);
            return res.status(500).json({ error: 'Failed to verify current PIN' });
        }

        // Verify current PIN
        if (currentPin !== currentData.value) {
            return res.status(401).json({ error: 'Current PIN is incorrect' });
        }

        // Update PIN
        const { data, error: updateError } = await supabase
            .from('settings')
            .update({
                value: newPin,
                updated_at: new Date().toISOString()
            })
            .eq('key', 'dashboard_pin')
            .select()
            .single();

        if (updateError) {
            console.error('Update error:', updateError);
            return res.status(500).json({ error: 'Failed to update PIN' });
        }

        return res.status(200).json({
            success: true,
            message: 'PIN updated successfully!'
        });
    } catch (error) {
        console.error('Update PIN error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
}