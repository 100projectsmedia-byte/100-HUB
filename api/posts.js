// ==================== POST ====================
if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    
    try {
        const { url, post_id, image_url, caption, permalink, writer, article_url, is_video, video_url, published_at } = req.body || {};

        // CASE 1: Manual entry with post_id and image_url
        if (post_id && image_url) {
            // Check if post already exists
            const { data: existing } = await supabase
                .from('posts')
                .select('id')
                .eq('post_id', post_id)
                .single();

            if (existing) {
                return res.status(400).json({ error: 'This post already exists in the database' });
            }

            const { data: post, error } = await supabase
                .from('posts')
                .insert({
                    instagram_url: permalink || `https://www.instagram.com/p/${post_id}/`,
                    post_id: post_id,
                    image_url: image_url,
                    caption: caption || '',
                    permalink: permalink || `https://www.instagram.com/p/${post_id}/`,
                    writer: writer || '100 HUB',
                    is_video: is_video || false,
                    video_url: video_url || '',
                    article_url: article_url || '',
                    published_at: published_at || new Date().toISOString(),
                    status: 'published'
                })
                .select()
                .single();

            if (error) {
                console.error('Supabase insert error:', error);
                return res.status(500).json({ error: 'Database error: ' + error.message });
            }

            return res.status(200).json({
                success: true,
                message: 'Post added successfully!',
                post: post
            });
        }

        // CASE 2: Auto-fetch from Instagram URL
        if (!url) {
            return res.status(400).json({ error: 'Instagram URL or manual post data is required' });
        }

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
            return res.status(400).json({ error: 'This post already exists in the database' });
        }

        const instagramData = await fetchInstagramData(url);
        if (!instagramData) {
            return res.status(400).json({ error: 'Failed to fetch Instagram data' });
        }

        let imageUrl = instagramData.thumbnail_url;
        if (imageUrl) {
            const cloudinaryUrl = await uploadToCloudinary(imageUrl);
            if (cloudinaryUrl) {
                imageUrl = cloudinaryUrl;
            }
        }

        const isVideo = url.includes('/reel/') || instagramData.html?.includes('video');
        const videoUrl = isVideo ? (instagramData.media_url || '') : '';

        const { data: post, error } = await supabase
            .from('posts')
            .insert({
                instagram_url: url,  // ← ADD THIS
                post_id: postId,
                image_url: imageUrl || '',
                caption: instagramData.title || '',
                permalink: url,
                writer: instagramData.author_name || '100 HUB',
                is_video: isVideo,
                video_url: videoUrl,
                article_url: article_url || '',
                published_at: new Date().toISOString(),
                status: 'published'
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: 'Database error: ' + error.message });
        }

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