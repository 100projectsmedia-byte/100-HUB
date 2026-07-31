// api/posts/sync.js
// Sync all posts from Instagram feed (Behold)
// NOTE: lives at /api/posts/sync.js

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../lib/adminAuth.js';

// Helper: Extract post ID from Instagram URL
function extractPostId(url) {
    const patterns = [
        /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
        /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Helper: Upload image to Cloudinary
async function uploadToCloudinary(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        
        const formData = new FormData();
        formData.append('file', `data:image/jpeg;base64,${base64}`);
        formData.append('upload_preset', 'members');
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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!requireAdmin(req, res)) return;

    try {
        const { feed_id = 'qBmSl39X4hdPVipZS1UR' } = req.body || {};
        const FEED_URL = `https://feeds.behold.so/${feed_id}`;

        // Fetch posts from Behold
        const response = await fetch(FEED_URL);
        if (!response.ok) throw new Error('Failed to fetch Instagram feed');
        
        const data = await response.json();
        const posts = data.posts || data;
        
        if (!posts || posts.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No posts found in feed',
                synced: 0,
                skipped: 0
            });
        }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

        let synced = 0;
        let skipped = 0;
        const errors = [];

        for (const post of posts) {
            try {
                // Extract post ID
                const postId = post.id || post.postId || '';
                if (!postId) {
                    skipped++;
                    continue;
                }

                // Check if post already exists
                const { data: existing } = await supabase
                    .from('posts')
                    .select('id')
                    .eq('post_id', postId)
                    .single();

                if (existing) {
                    skipped++;
                    continue;
                }

                // Get image URL
                let imageUrl = '';
                if (post.sizes?.large?.mediaUrl) {
                    imageUrl = post.sizes.large.mediaUrl;
                } else if (post.mediaUrl) {
                    imageUrl = post.mediaUrl;
                } else if (post.sizes?.medium?.mediaUrl) {
                    imageUrl = post.sizes.medium.mediaUrl;
                }

                // Handle carousel posts
                if (post.mediaType === 'CAROUSEL_ALBUM' && post.children?.length > 0) {
                    const child = post.children[0];
                    if (child.sizes?.large?.mediaUrl) {
                        imageUrl = child.sizes.large.mediaUrl;
                    } else if (child.mediaUrl) {
                        imageUrl = child.mediaUrl;
                    }
                }

                // Upload to Cloudinary
                let cloudinaryUrl = '';
                if (imageUrl) {
                    cloudinaryUrl = await uploadToCloudinary(imageUrl);
                }

                // Determine if video
                const isVideo = post.mediaType === 'VIDEO' || post.isReel === true;
                const videoUrl = isVideo ? (post.mediaUrl || '') : '';

                // Get caption and permalink
                const caption = post.prunedCaption || post.caption || '';
                const permalink = post.permalink || `https://www.instagram.com/p/${postId}/`;
                const writer = '100 HUB';

                // Save to database
                const { error } = await supabase
                    .from('posts')
                    .insert({
                        post_id: postId,
                        image_url: cloudinaryUrl || imageUrl || '',
                        caption: caption,
                        permalink: permalink,
                        writer: writer,
                        is_video: isVideo,
                        video_url: videoUrl,
                        published_at: post.timestamp ? new Date(post.timestamp).toISOString() : new Date().toISOString()
                    });

                if (error) {
                    errors.push({ postId, error: error.message });
                } else {
                    synced++;
                }
            } catch (error) {
                errors.push({ postId: post.id || 'unknown', error: error.message });
            }
        }

        return res.status(200).json({
            success: true,
            message: `Synced ${synced} posts, skipped ${skipped} existing posts`,
            synced,
            skipped,
            total: posts.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Sync error:', error);
        return res.status(500).json({ error: 'Failed to sync posts: ' + error.message });
    }
}