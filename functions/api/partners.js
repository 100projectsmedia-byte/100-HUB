// functions/api/partners.js
// Manages partners via Supabase

import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
    const { request, env } = context;
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    // GET - fetch all partners
    if (request.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('partners')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            return new Response(JSON.stringify({ logos: data || [] }), {
                status: 200,
                headers
            });
        } catch (error) {
            console.error('GET partners error:', error);
            return new Response(JSON.stringify({ logos: [] }), {
                status: 200,
                headers
            });
        }
    }

    // POST - add a new partner
    if (request.method === 'POST') {
        try {
            const body = await request.json();
            const { url, name } = body;

            if (!url || !name) {
                return new Response(JSON.stringify({ error: 'URL and name are required' }), {
                    status: 400,
                    headers
                });
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

            return new Response(JSON.stringify({
                success: true,
                logos: allPartners || []
            }), {
                status: 200,
                headers
            });
        } catch (error) {
            console.error('Add partner error:', error);
            return new Response(JSON.stringify({ error: 'Failed to add partner: ' + error.message }), {
                status: 500,
                headers
            });
        }
    }

    // DELETE - remove a partner
    if (request.method === 'DELETE') {
        try {
            const body = await request.json();
            const { id } = body;

            if (!id) {
                return new Response(JSON.stringify({ error: 'ID is required' }), {
                    status: 400,
                    headers
                });
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

            return new Response(JSON.stringify({
                success: true,
                logos: allPartners || []
            }), {
                status: 200,
                headers
            });
        } catch (error) {
            console.error('Delete partner error:', error);
            return new Response(JSON.stringify({ error: 'Failed to delete partner: ' + error.message }), {
                status: 500,
                headers
            });
        }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers
    });
}