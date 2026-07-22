// functions/api/impact-numbers.js
// Manages impact numbers via Supabase

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

    // GET - fetch impact numbers
    if (request.method === 'GET') {
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
                return new Response(JSON.stringify({ success: true, data }), {
                    status: 200,
                    headers
                });
            }

            // Return defaults if no data
            return new Response(JSON.stringify({
                success: true,
                data: {
                    magazine: 8,
                    features: 100,
                    collaborations: 50,
                    reach: 1000000
                }
            }), {
                status: 200,
                headers
            });
        } catch (error) {
            console.error('GET impact numbers error:', error);
            return new Response(JSON.stringify({
                success: true,
                data: {
                    magazine: 8,
                    features: 100,
                    collaborations: 50,
                    reach: 1000000
                }
            }), {
                status: 200,
                headers
            });
        }
    }

    // POST - update impact numbers
    if (request.method === 'POST') {
        try {
            const body = await request.json();
            const { magazine, features, collaborations, reach } = body;

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

            return new Response(JSON.stringify({
                success: true,
                message: 'Impact numbers saved!',
                data: result
            }), {
                status: 200,
                headers
            });
        } catch (error) {
            console.error('POST impact numbers error:', error);
            return new Response(JSON.stringify({ error: 'Failed to save impact numbers: ' + error.message }), {
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