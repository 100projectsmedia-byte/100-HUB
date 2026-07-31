// api/posts/fetch.js
// Fetch Instagram post data via server-side proxy (bypasses CORS)

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

    try {
        const { url } = req.body || {};

        if (!url) {
            return res.status(400).json({ error: 'Instagram URL is required' });
        }

        // Extract post ID from URL
        let postId = '';
        const patterns = [
            /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
            /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
            /instagram\.com\/tv\/([A-Za-z0-9_-]+)/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                postId = match[1];
                break;
            }
        }

        if (!postId) {
            return res.status(400).json({ error: 'Could not extract post ID from URL' });
        }

        // Try to fetch via Instagram OEmbed (server-side, bypasses CORS)
        let imageUrl = '';
        let caption = '';
        let author = '100 HUB';
        let permalink = url;

        try {
            const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
            const response = await fetch(oembedUrl);
            
            if (response.ok) {
                const data = await response.json();
                imageUrl = data.thumbnail_url || '';
                caption = data.title || '';
                author = data.author_name || '100 HUB';
                permalink = data.author_url || url;
            }
        } catch (error) {
            console.log('OEmbed fetch failed, using manual mode');
        }

        // If OEmbed didn't work, try to get image via a different method
        if (!imageUrl) {
            // Try using the Instagram CDN URL format
            imageUrl = `https://www.instagram.com/p/${postId}/media/?size=l`;
        }

        return res.status(200).json({
            success: true,
            data: {
                post_id: postId,
                image_url: imageUrl,
                caption: caption,
                permalink: permalink,
                writer: author
            }
        });

    } catch (error) {
        console.error('Fetch error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch post data: ' + error.message 
        });
    }
}