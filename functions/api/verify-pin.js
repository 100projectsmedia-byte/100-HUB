// functions/api/verify-pin.js
// Verifies dashboard PIN from Supabase

import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
    const { request, env } = context;
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers
        });
    }

    try {
        const body = await request.json();
        const { pin } = body;

        if (!pin) {
            return new Response(JSON.stringify({ error: 'PIN is required' }), {
                status: 400,
                headers
            });
        }

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

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
            return new Response(JSON.stringify({ 
                success: isCorrect,
                error: isCorrect ? null : 'Invalid PIN'
            }), {
                status: 200,
                headers
            });
        }

        const isCorrect = pin === data.value;

        return new Response(JSON.stringify({ 
            success: isCorrect,
            error: isCorrect ? null : 'Invalid PIN'
        }), {
            status: 200,
            headers
        });
    } catch (error) {
        console.error('Verify PIN error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Server error' 
        }), {
            status: 500,
            headers
        });
    }
}