// api/impact-numbers.js
// Manages impact numbers via Supabase
// NOTE: lives at /api/impact-numbers.js at the project ROOT for Vercel to detect it.

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

    // GET - fetch impact numbers
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('impact_numbers')
                .select('*')
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                return res.status(200).json({ success: true, data });
            }

            // Return defaults if no data
            return res.status(200).json({
                success: true,
                data: {
                    magazine: 8,
                    features: 100,
                    collaborations: 50,
                    reach: 1000000
                }
            });
        } catch (error) {
            console.error('GET impact numbers error:', error);
            return res.status(200).json({
                success: true,
                data: {
                    magazine: 8,
                    features: 100,
                    collaborations: 50,
                    reach: 1000000
                }
            });
        }
    }

    // POST - update impact numbers
    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        try {
            const { magazine, features, collaborations, reach } = req.body || {};

            // First, get the existing record
            const { data: existing, error: fetchError } = await supabase
                .from('impact_numbers')
                .select('id')
                .limit(1)
                .single();

            let result;

            if (existing) {
                // Update existing
                const { data, error } = await supabase
                    .from('impact_numbers')
                    .update({
                        magazine: magazine || 8,
                        features: features || 100,
                        collaborations: collaborations || 50,
                        reach: reach || 1000000,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            } else {
                // Insert new
                const { data, error } = await supabase
                    .from('impact_numbers')
                    .insert({
                        magazine: magazine || 8,
                        features: features || 100,
                        collaborations: collaborations || 50,
                        reach: reach || 1000000
                    })
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            }

            return res.status(200).json({
                success: true,
                message: 'Impact numbers saved!',
                data: result
            });
        } catch (error) {
            console.error('POST impact numbers error:', error);
            return res.status(500).json({ error: 'Failed to save impact numbers: ' + error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}