// api/media-kit.js
// Manages media kit URL via Supabase
// NOTE: lives at /api/media-kit.js at the project ROOT for Vercel to detect it.

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../lib/adminAuth.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    // GET - fetch media kit URL
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('media_kit')
                .select('url')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 means no rows found
                console.error('Supabase fetch error:', error);
            }

            if (data && data.url) {
                return res.status(200).json({ success: true, url: data.url });
            }

            return res.status(404).json({ error: 'Media Kit not found' });
        } catch (error) {
            console.error('GET media kit error:', error);
            return res.status(500).json({ error: 'Failed to fetch media kit' });
        }
    }

    // POST - update media kit URL
    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        try {
            const { url } = req.body || {};

            if (!url) {
                return res.status(400).json({ error: 'URL is required' });
            }

            // Validate URL
            try {
                new URL(url);
            } catch (e) {
                return res.status(400).json({ error: 'Invalid URL format' });
            }

            const { error } = await supabase
                .from('media_kit')
                .insert({ url });

            if (error) throw error;

            return res.status(200).json({
                success: true,
                message: 'Media Kit URL saved successfully!',
                url: url
            });
        } catch (error) {
            console.error('POST media kit error:', error);
            return res.status(500).json({ error: 'Failed to save media kit: ' + error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}