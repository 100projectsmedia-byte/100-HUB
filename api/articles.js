// api/articles.js
// Manages articles via Supabase
// NOTE: lives at /api/articles.js at the project ROOT for Vercel to detect it.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    // GET - fetch all articles
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('articles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.status(200).json({ articles: data || [] });
        } catch (error) {
            console.error('GET articles error:', error);
            return res.status(200).json({ articles: [] });
        }
    }

    // POST - add a new article
    if (req.method === 'POST') {
        try {
            const { postId, articleUrl } = req.body || {};

            if (!postId || !articleUrl) {
                return res.status(400).json({ error: 'postId and articleUrl are required' });
            }

            const { error } = await supabase
                .from('articles')
                .insert({ post_id: postId, article_url: articleUrl });

            if (error) throw error;

            return res.status(200).json({ success: true, message: 'Article added!' });
        } catch (error) {
            console.error('POST article error:', error);
            return res.status(500).json({ error: 'Failed to add article' });
        }
    }

    // DELETE - remove an article
    if (req.method === 'DELETE') {
        try {
            const { id } = req.body || {};

            if (!id) {
                return res.status(400).json({ error: 'ID is required' });
            }

            const { error } = await supabase
                .from('articles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return res.status(200).json({ success: true, message: 'Article deleted!' });
        } catch (error) {
            console.error('DELETE article error:', error);
            return res.status(500).json({ error: 'Failed to delete article' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
