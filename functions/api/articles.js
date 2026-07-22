// functions/api/articles.js
// Manages articles via Supabase

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

    // GET - fetch all articles
    if (request.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('articles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return new Response(JSON.stringify({ articles: data || [] }), {
                status: 200,
                headers
            });
        } catch (error) {
            console.error('GET articles error:', error);
            return new Response(JSON.stringify({ articles: [] }), {
                status: 200,
                headers
            });
        }
    }

    // POST - add a new article
    if (request.method === 'POST') {
        try {
            const body = await request.json();
            const { postId, articleUrl } = body;

            if (!postId || !articleUrl) {
                return new Response(JSON.stringify({ error: 'postId and articleUrl are required' }), {
                    status: 400,
                    headers
                });
            }

            const { error } = await supabase
                .from('articles')
                .insert({ post_id: postId, article_url: articleUrl });

            if (error) throw error;

            return new Response(JSON.stringify({ success: true, message: 'Article added!' }), {
                status: 200,
                headers
            });
        } catch (error) {
            console.error('POST article error:', error);
            return new Response(JSON.stringify({ error: 'Failed to add article' }), {
                status: 500,
                headers
            });
        }
    }

    // DELETE - remove an article
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
                .from('articles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return new Response(JSON.stringify({ success: true, message: 'Article deleted!' }), {
                status: 200,
                headers
            });
        } catch (error) {
            console.error('DELETE article error:', error);
            return new Response(JSON.stringify({ error: 'Failed to delete article' }), {
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