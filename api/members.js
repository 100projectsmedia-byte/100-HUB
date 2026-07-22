// api/members.js
// Fetches members from Supabase
// NOTE: lives at /api/members.js at the project ROOT for Vercel to detect it.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

        const statusFilter = req.query.status || 'all';
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 100;
        const start = page * limit;

        let query = supabase
            .from('members')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data: members, error, count } = await query.range(start, start + limit - 1);

        if (error) {
            console.error('Supabase fetch error:', error);
            throw error;
        }

        // Get counts for stats
        const { count: totalCount } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true });

        const { count: acceptedCount } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted');

        const { count: pendingCount } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        const { count: declinedCount } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'declined');

        const result = {
            members: members || [],
            count: acceptedCount || 0,
            total: totalCount || 0,
            accepted: acceptedCount || 0,
            pending: pendingCount || 0,
            declined: declinedCount || 0
        };

        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(result);
    } catch (error) {
        console.error('Members error:', error);
        return res.status(200).json({
            members: [],
            count: 0,
            total: 0,
            accepted: 0,
            pending: 0,
            declined: 0
        });
    }
}
