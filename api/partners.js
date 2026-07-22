// api/partners.js
// Manages partners via Supabase
// NOTE: lives at /api/partners.js at the project ROOT for Vercel to detect it.

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../lib/adminAuth.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    // GET - fetch all partners
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('partners')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            return res.status(200).json({ logos: data || [] });
        } catch (error) {
            console.error('GET partners error:', error);
            return res.status(200).json({ logos: [] });
        }
    }

    // POST - add a new partner
    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        try {
            const { url, name } = req.body || {};

            if (!url || !name) {
                return res.status(400).json({ error: 'URL and name are required' });
            }

            const { data, error } = await supabase
                .from('partners')
                .insert({ name, url })
                .select();

            if (error) throw error;

            // Get updated list
            const { data: allPartners } = await supabase
                .from('partners')
                .select('*')
                .order('created_at', { ascending: true });

            return res.status(200).json({
                success: true,
                logos: allPartners || []
            });
        } catch (error) {
            console.error('Add partner error:', error);
            return res.status(500).json({ error: 'Failed to add partner: ' + error.message });
        }
    }

    // DELETE - remove a partner
    if (req.method === 'DELETE') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id } = req.body || {};

            if (!id) {
                return res.status(400).json({ error: 'ID is required' });
            }

            const { error } = await supabase
                .from('partners')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Get updated list
            const { data: allPartners } = await supabase
                .from('partners')
                .select('*')
                .order('created_at', { ascending: true });

            return res.status(200).json({
                success: true,
                logos: allPartners || []
            });
        } catch (error) {
            console.error('Delete partner error:', error);
            return res.status(500).json({ error: 'Failed to delete partner: ' + error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}