// functions/api/members.js
// Fetches members from Supabase

import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
    const { request, env } = context;
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers
        });
    }

    try {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
        
        const url = new URL(request.url);
        const statusFilter = url.searchParams.get('status') || 'all';
        const page = parseInt(url.searchParams.get('page')) || 0;
        const limit = parseInt(url.searchParams.get('limit')) || 100;
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

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...headers, 'Cache-Control': 'no-store' }
        });
    } catch (error) {
        console.error('Members error:', error);
        return new Response(JSON.stringify({
            members: [],
            count: 0,
            total: 0,
            accepted: 0,
            pending: 0,
            declined: 0
        }), {
            status: 200,
            headers
        });
    }
}