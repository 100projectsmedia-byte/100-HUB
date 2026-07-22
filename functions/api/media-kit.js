// functions/api/media-kit.js
// Manages media kit URL via Supabase

import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
    const { request, env } = context;
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    // GET - fetch media kit URL
    if (request.method === 'GET') {
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
                return new Response(JSON.stringify({ success: true, url: data.url }), {
                    status: 200,
                    headers
                });
            }

            return new Response(JSON.stringify({ error: 'Media Kit not found' }), {
                status: 404,
                headers
            });
        } catch (error) {
            console.error('GET media kit error:', error);
            return new Response(JSON.stringify({ error: 'Failed to fetch media kit' }), {
                status: 500,
                headers
            });
        }
    }

    // POST - update media kit URL
    if (request.method === 'POST') {
        try {
            const { url } = await request.json();

            if (!url) {
                return new Response(JSON.stringify({ error: 'URL is required' }), {
                    status: 400,
                    headers
                });
            }

            // Validate URL
            try {
                new URL(url);
            } catch (e) {
                return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
                    status: 400,
                    headers
                });
            }

            const { error } = await supabase
                .from('media_kit')
                .insert({ url });

            if (error) throw error;

            return new Response(JSON.stringify({
                success: true,
                message: 'Media Kit URL saved successfully!',
                url: url
            }), {
                status: 200,
                headers
            });
        } catch (error) {
            console.error('POST media kit error:', error);
            return new Response(JSON.stringify({ error: 'Failed to save media kit: ' + error.message }), {
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