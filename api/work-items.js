// api/work-items.js
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../lib/adminAuth.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    // GET - fetch all work items
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('work_items')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;
            return res.status(200).json({ success: true, items: data || [] });
        } catch (error) {
            console.error('GET work items error:', error);
            return res.status(200).json({ success: true, items: [] });
        }
    }

    // POST - add new work item
    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        try {
            const { title, description, media_url, media_type, category, display_order, featured } = req.body || {};

            if (!title || !media_url) {
                return res.status(400).json({ error: 'Title and media URL are required' });
            }

            const { data, error } = await supabase
                .from('work_items')
                .insert({
                    title,
                    description: description || '',
                    media_url,
                    media_type: media_type || 'image',
                    category: category || '',
                    display_order: display_order || 0,
                    featured: featured || false,
                    published_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return res.status(200).json({ success: true, item: data });
        } catch (error) {
            console.error('POST work item error:', error);
            return res.status(500).json({ error: 'Failed to add work item: ' + error.message });
        }
    }

    // PUT - update work item
    if (req.method === 'PUT') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id, title, description, media_url, media_type, category, display_order, featured } = req.body || {};

            if (!id) {
                return res.status(400).json({ error: 'ID is required' });
            }

            const updates = {};
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (media_url !== undefined) updates.media_url = media_url;
            if (media_type !== undefined) updates.media_type = media_type;
            if (category !== undefined) updates.category = category;
            if (display_order !== undefined) updates.display_order = display_order;
            if (featured !== undefined) updates.featured = featured;
            updates.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from('work_items')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return res.status(200).json({ success: true, item: data });
        } catch (error) {
            console.error('PUT work item error:', error);
            return res.status(500).json({ error: 'Failed to update work item: ' + error.message });
        }
    }

    // DELETE - remove work item
    if (req.method === 'DELETE') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id } = req.body || {};

            if (!id) {
                return res.status(400).json({ error: 'ID is required' });
            }

            const { error } = await supabase
                .from('work_items')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Work item deleted!' });
        } catch (error) {
            console.error('DELETE work item error:', error);
            return res.status(500).json({ error: 'Failed to delete work item: ' + error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}