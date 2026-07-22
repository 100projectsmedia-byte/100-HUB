// functions/api/update-pin.js
// Updates the dashboard PIN in Supabase

import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
    const { request, env } = context;
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST' && request.method !== 'PUT') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers
        });
    }

    try {
        const body = await request.json();
        const { currentPin, newPin } = body;

        if (!currentPin || !newPin) {
            return new Response(JSON.stringify({ error: 'Current PIN and new PIN are required' }), {
                status: 400,
                headers
            });
        }

        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            return new Response(JSON.stringify({ error: 'PIN must be exactly 4 digits' }), {
                status: 400,
                headers
            });
        }

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

        // Get current PIN
        const { data: currentData, error: fetchError } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'dashboard_pin')
            .single();

        if (fetchError) {
            console.error('Fetch error:', fetchError);
            return new Response(JSON.stringify({ error: 'Failed to verify current PIN' }), {
                status: 500,
                headers
            });
        }

        // Verify current PIN
        if (currentPin !== currentData.value) {
            return new Response(JSON.stringify({ error: 'Current PIN is incorrect' }), {
                status: 401,
                headers
            });
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
            return new Response(JSON.stringify({ error: 'Failed to update PIN' }), {
                status: 500,
                headers
            });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'PIN updated successfully!'
        }), {
            status: 200,
            headers
        });
    } catch (error) {
        console.error('Update PIN error:', error);
        return new Response(JSON.stringify({ error: 'Server error' }), {
            status: 500,
            headers
        });
    }
}