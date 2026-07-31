// api/posts.js
// Manages posts with auto-fetch from Instagram
// NOTE: lives at /api/posts.js at the project ROOT

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../lib/adminAuth.js';

// Helper: Extract post ID from Instagram URL
function extractPostId(url) {
    const patterns = [
        /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
        /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
        /instagram\.com\/tv\/([A-Za-z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Helper: Fetch Instagram post data via OEmbed
async function fetchInstagramData(url) {
    try {
        const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl);
        if (!response.ok) throw new Error('Failed to fetch Instagram data');
        const data = await response.json();
        
        return {
            thumbnail_url: data.thumbnail_url || '',
            title: data.title || '',
            author_name: data.author_name || '',
            author_url: data.author_url || '',
            html: data.html || ''
        };
    } catch (error) {
        console.error('Instagram fetch error:', error);
        return null;
    }
}

// Helper: Upload image to Cloudinary
async function uploadToCloudinary(imageUrl) {
    try {
        // Fetch the image
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        
        const formData = new FormData();
        formData.append('file', `data:image/jpeg;base64,${base64}`);
        formData.append('upload_preset', 'members'); // Use existing preset
        formData.append('folder', '100 TRUSTEES');
        
        const uploadResponse = await fetch('https://api.cloudinary.com/v1_1/dfozevcbl/image/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) throw new Error('Cloudinary upload failed');
        const result = await uploadResponse.json();
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        return null;
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    // ==================== GET ====================
    if (req.method === 'GET') {
        try {
            const { page = 1, limit = 20, search = '' } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            let query = supabase
                .from('posts')
                .select('*', { count: 'exact' })
                .order('published_at', { ascending: false });

            // Apply search filter if provided
            if (search && search.trim()) {
                const searchTerm = search.trim();
                query = query.or(`caption.ilike.%${searchTerm}%,post_id.ilike.%${searchTerm}%`);
            }

            const { data: posts, error, count } = await query
                .range(offset, offset + parseInt(limit) - 1);

            if (error) throw error;

            return res.status(200).json({
                success: true,
                posts: posts || [],
                total: count || 0,
                page: parseInt(page),
                limit: parseInt(limit)
            });
        } catch (error) {
            console.error('GET posts error:', error);
            return res.status(200).json({ 
                success: true, 
                posts: [], 
                total: 0,
                page: 1,
                limit: 20
            });
        }
    }

    // ==================== POST - Add from URL ====================
    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        
        try {
            const { url, article_url } = req.body || {};

            if (!url) {
                return res.status(400).json({ error: 'Instagram URL is required' });
            }

            // Extract post ID
            const postId = extractPostId(url);
            if (!postId) {
                return res.status(400).json({ error: 'Invalid Instagram URL' });
            }

            // Check if post already exists
            const { data: existing } = await supabase
                .from('posts')
                .select('id')
                .eq('post_id', postId)
                .single();

            if (existing) {
                return res.status(400).json({ 
                    error: 'This post already exists in the database' 
                });
            }

            // Fetch Instagram data
            const instagramData = await fetchInstagramData(url);
            if (!instagramData) {
                return res.status(400).json({ error: 'Failed to fetch Instagram data' });
            }

            // Upload image to Cloudinary
            let imageUrl = instagramData.thumbnail_url;
            if (imageUrl) {
                const cloudinaryUrl = await uploadToCloudinary(imageUrl);
                if (cloudinaryUrl) {
                    imageUrl = cloudinaryUrl;
                }
            }

            // Check if it's a video
            const isVideo = url.includes('/reel/') || instagramData.html?.includes('video');

            // Save to database
            const { data: post, error } = await supabase
                .from('posts')
                .insert({
                    post_id: postId,
                    image_url: imageUrl || '',
                    caption: instagramData.title || '',
                    permalink: url,
                    writer: instagramData.author_name || '100 HUB',
                    is_video: isVideo,
                    article_url: article_url || '',
                    published_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                message: 'Post added successfully!',
                post: post
            });
        } catch (error) {
            console.error('POST post error:', error);
            return res.status(500).json({ error: 'Failed to add post: ' + error.message });
        }
    }

    // ==================== PUT - Update post ====================
    if (req.method === 'PUT') {
        if (!requireAdmin(req, res)) return;
        
        try {
            const { id, caption, writer, article_url, published_at } = req.body || {};

            if (!id) {
                return res.status(400).json({ error: 'Post ID is required' });
            }

            const updates = {};
            if (caption !== undefined) updates.caption = caption;
            if (writer !== undefined) updates.writer = writer;
            if (article_url !== undefined) updates.article_url = article_url;
            if (published_at !== undefined) updates.published_at = published_at;
            updates.updated_at = new Date().toISOString();

            const { data: post, error } = await supabase
                .from('posts')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                message: 'Post updated successfully!',
                post: post
            });
        } catch (error) {
            console.error('PUT post error:', error);
            return res.status(500).json({ error: 'Failed to update post: ' + error.message });
        }
    }

    // ==================== DELETE ====================
    if (req.method === 'DELETE') {
        if (!requireAdmin(req, res)) return;
        
        try {
            const { id } = req.body || {};

            if (!id) {
                return res.status(400).json({ error: 'Post ID is required' });
            }

            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return res.status(200).json({
                success: true,
                message: 'Post deleted successfully!'
            });
        } catch (error) {
            console.error('DELETE post error:', error);
            return res.status(500).json({ error: 'Failed to delete post: ' + error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}