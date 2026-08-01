// api/index.js
// Consolidated API - handles all endpoints in one file

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../lib/adminAuth.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ==========================================
// EMAIL FUNCTIONS
// ==========================================

const EMAIL_FROM = 'noreply@100hub.co.za';
const REPLY_TO_EMAIL = '100projectsmedia@gmail.com';

async function sendEmail({ to, subject, html }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('RESEND_API_KEY not set — skipping email');
        return;
    }
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: `100 HUB <${EMAIL_FROM}>`,
                to: [to],
                reply_to: REPLY_TO_EMAIL,
                subject,
                html
            })
        });
        if (!res.ok) {
            console.error('Resend error:', await res.text());
        } else {
            console.log('✅ Email sent to:', to);
        }
    } catch (error) {
        console.error('Email error:', error);
    }
}

async function sendConfirmationEmail(email, name) {
    const html = `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1A1A1A;">
            <h1 style="font-size:26px;font-weight:700;margin-bottom:8px;">Hi ${name},</h1>
            <p style="font-size:16px;color:#4A4A4A;line-height:1.7;margin-bottom:24px;">
                Thank you for applying to join the 100 HUB community! 🙌
            </p>
            <p style="font-size:15px;color:#4A4A4A;line-height:1.7;margin-bottom:24px;">
                We've received your application and we're excited to review your profile.
            </p>
            <div style="background:#F5F5F5;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
                <p style="margin:0 0 10px;font-size:12px;color:#8A8A8A;text-transform:uppercase;letter-spacing:1px;">What happens next</p>
                <ul style="margin:0;padding-left:18px;font-size:14px;color:#4A4A4A;line-height:2.2;">
                    <li>Our team will review your application</li>
                    <li>You'll receive a welcome email once accepted</li>
                    <li>You'll get access to exclusive opportunities and events</li>
                </ul>
            </div>
            <p style="font-size:14px;color:#8A8A8A;line-height:1.7;">
                Follow us on Instagram 
                <a href="https://instagram.com/100projectsmedia" style="color:#E31E24;">@100projectsmedia</a>.
            </p>
            <hr style="border:none;border-top:1px solid #E8E4DE;margin:32px 0;" />
            <p style="font-size:12px;color:#B8B0A8;">100 HUB · Broadcasting &amp; Media Production Company</p>
        </div>
    `;
    await sendEmail({
        to: email,
        subject: '✅ Application Received - 100 HUB',
        html
    });
}

async function sendAcceptedEmail(email, name) {
    const html = `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1A1A1A;">
            <h1 style="font-size:26px;font-weight:700;margin-bottom:8px;">Welcome to the 100 Family, ${name}!</h1>
            <p style="font-size:16px;color:#4A4A4A;line-height:1.7;margin-bottom:24px;">
                Your application has been reviewed and we're excited to let you know — 
                you've been <strong>officially accepted</strong> as a member of the 100 HUB creative community.
            </p>
            <div style="background:#F5F5F5;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
                <p style="margin:0 0 10px;font-size:12px;color:#8A8A8A;text-transform:uppercase;letter-spacing:1px;">What to expect</p>
                <ul style="margin:0;padding-left:18px;font-size:14px;color:#4A4A4A;line-height:2;">
                    <li>Your profile is now live on the 100 HUB</li>
                    <li>Creative opportunities and collaborations</li>
                    <li>Editorial features in 100 Magazine</li>
                    <li>Exclusive events and networking</li>
                    <li>Brand collaborations and partnerships</li>
                </ul>
            </div>
            <p style="font-size:14px;color:#8A8A8A;line-height:1.7;">
                Follow us on Instagram 
                <a href="https://instagram.com/100projectsmedia" style="color:#E31E24;">@100projectsmedia</a> 
                and stay connected with the community.
            </p>
            <hr style="border:none;border-top:1px solid #E8E4DE;margin:32px 0;" />
            <p style="font-size:12px;color:#B8B0A8;">100 HUB · Broadcasting &amp; Media Production Company</p>
        </div>
    `;
    await sendEmail({
        to: email,
        subject: "🎉 You've been accepted to 100 HUB!",
        html
    });
}

async function sendDeclinedEmail(email, name) {
    const html = `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1A1A1A;">
            <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">Hello ${name},</h1>
            <p style="font-size:16px;color:#4A4A4A;line-height:1.7;margin-bottom:24px;">
                Thank you for your interest in joining the 100 HUB community. After carefully reviewing your application,
                we are unable to accept you as a member at this time.
            </p>
            <p style="font-size:15px;color:#4A4A4A;line-height:1.7;margin-bottom:24px;">
                A member of our team may be in touch with more details. We encourage you to stay connected 
                and keep creating — the door isn't closed.
            </p>
            <p style="font-size:14px;color:#8A8A8A;line-height:1.7;">
                Follow us on Instagram 
                <a href="https://instagram.com/100projectsmedia" style="color:#E31E24;">@100projectsmedia</a>.
            </p>
            <hr style="border:none;border-top:1px solid #E8E4DE;margin:32px 0;" />
            <p style="font-size:12px;color:#B8B0A8;">100 HUB · Broadcasting &amp; Media Production Company</p>
        </div>
    `;
    await sendEmail({
        to: email,
        subject: 'Update on your 100 HUB Application',
        html
    });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

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

// ==========================================
// HANDLERS
// ==========================================

// MEMBERS
async function handleMembers(req, res) {
    if (req.method === 'GET') {
        try {
            const statusFilter = req.query.status || 'all';
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 100;
            const start = page * limit;

            let query = supabase
                .from('members')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            const { data: members, error, count } = await query.range(start, start + limit - 1);
            if (error) throw error;

            const { count: acceptedCount } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'accepted');

            return res.status(200).json({
                members: members || [],
                count: acceptedCount || 0,
                total: count || 0,
                accepted: acceptedCount || 0
            });
        } catch (error) {
            return res.status(200).json({ members: [], count: 0, total: 0, accepted: 0 });
        }
    }

    if (req.method === 'DELETE') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id } = req.body || {};
            if (!id) return res.status(400).json({ error: 'Member ID is required' });
            
            const { error } = await supabase.from('members').delete().eq('id', id);
            if (error) throw error;
            
            return res.status(200).json({ success: true, message: 'Member deleted successfully!' });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete member: ' + error.message });
        }
    }
}

// SIGNUP
async function handleSignup(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    try {
        const { name, email, role, skills, website, image1, image2, image3, socialPlatform, socialHandle } = req.body || {};
        if (!name || !email || !role) {
            return res.status(400).json({ error: 'Name, email, and role are required' });
        }

        const { data: existing } = await supabase.from('members').select('email').eq('email', email).single();
        if (existing) {
            return res.status(400).json({ error: 'This email is already registered.' });
        }

        const { data, error } = await supabase.from('members').insert({
            name, email, role,
            skills: skills || '',
            website: website || '',
            social_platform: socialPlatform || '',
            social_handle: socialHandle || '',
            image1: image1 || '',
            image2: image2 || '',
            image3: image3 || '',
            status: 'pending'
        }).select().single();

        if (error) throw error;

        // Send confirmation email
        await sendConfirmationEmail(email, name);

        return res.status(200).json({ success: true, message: 'Successfully joined the community!', member: data });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to save member data: ' + error.message });
    }
}

// UPDATE MEMBER
async function handleUpdateMember(req, res) {
    if (!requireAdmin(req, res)) return;
    try {
        const { email, status, selectedImage, name, role, skills } = req.body || {};
        if (!email) return res.status(400).json({ error: 'Member email is required' });

        // Get current member data
        const { data: existingMember } = await supabase
            .from('members')
            .select('name')
            .eq('email', email)
            .single();

        const memberName = name || existingMember?.name || 'Member';

        const updates = {};
        if (status !== undefined) updates.status = status;
        if (selectedImage !== undefined) updates.selected_image = selectedImage;
        if (name !== undefined) updates.name = name;
        if (role !== undefined) updates.role = role;
        if (skills !== undefined) updates.skills = skills;
        updates.updated_at = new Date().toISOString();

        const { data: updated, error } = await supabase
            .from('members')
            .update(updates)
            .eq('email', email)
            .select()
            .single();

        if (error) throw error;

        // Send email based on status change
        if (status === 'accepted') {
            await sendAcceptedEmail(email, memberName);
        } else if (status === 'declined') {
            await sendDeclinedEmail(email, memberName);
        }

        return res.status(200).json({ success: true, message: 'Member updated successfully', member: updated });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update member: ' + error.message });
    }
}

// PARTNERS
async function handlePartners(req, res) {
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase.from('partners').select('*').order('created_at', { ascending: true });
            if (error) throw error;
            return res.status(200).json({ logos: data || [] });
        } catch (error) {
            return res.status(200).json({ logos: [] });
        }
    }

    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        try {
            const { url, name } = req.body || {};
            if (!url || !name) return res.status(400).json({ error: 'URL and name are required' });
            
            const { data, error } = await supabase.from('partners').insert({ name, url }).select();
            if (error) throw error;
            
            const { data: allPartners } = await supabase.from('partners').select('*').order('created_at', { ascending: true });
            return res.status(200).json({ success: true, logos: allPartners || [] });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to add partner: ' + error.message });
        }
    }

    if (req.method === 'DELETE') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id } = req.body || {};
            if (!id) return res.status(400).json({ error: 'ID is required' });
            
            const { error } = await supabase.from('partners').delete().eq('id', id);
            if (error) throw error;
            
            const { data: allPartners } = await supabase.from('partners').select('*').order('created_at', { ascending: true });
            return res.status(200).json({ success: true, logos: allPartners || [] });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete partner: ' + error.message });
        }
    }
}

// POSTS
async function handlePosts(req, res) {
    if (req.method === 'GET') {
        try {
            const { page = 1, limit = 20, search = '' } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            let query = supabase.from('posts').select('*', { count: 'exact' }).order('published_at', { ascending: false, nullsLast: true });
            if (search && search.trim()) {
                const searchTerm = search.trim();
                query = query.or(`caption.ilike.%${searchTerm}%,post_id.ilike.%${searchTerm}%`);
            }
            const { data: posts, error, count } = await query.range(offset, offset + parseInt(limit) - 1);
            if (error) throw error;
            return res.status(200).json({ success: true, posts: posts || [], total: count || 0, page: parseInt(page), limit: parseInt(limit) });
        } catch (error) {
            return res.status(200).json({ success: true, posts: [], total: 0, page: 1, limit: 20 });
        }
    }

    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        try {
            const { url, post_id, image_url, caption, permalink, writer, article_url, is_video, video_url, published_at } = req.body || {};

            // Manual entry
            if (post_id && image_url) {
                const { data: existing } = await supabase.from('posts').select('id').eq('post_id', post_id).single();
                if (existing) return res.status(400).json({ error: 'This post already exists in the database' });

                const { data: post, error } = await supabase.from('posts').insert({
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
                }).select().single();

                if (error) throw error;
                return res.status(200).json({ success: true, message: 'Post added successfully!', post: post });
            }

            // Auto-fetch from Instagram
            if (!url) return res.status(400).json({ error: 'Instagram URL or manual post data is required' });
            const postId = extractPostId(url);
            if (!postId) return res.status(400).json({ error: 'Invalid Instagram URL' });

            const { data: existing } = await supabase.from('posts').select('id').eq('post_id', postId).single();
            if (existing) return res.status(400).json({ error: 'This post already exists in the database' });

            const instagramData = await fetchInstagramData(url);
            if (!instagramData) return res.status(400).json({ error: 'Failed to fetch Instagram data' });

            let imageUrl = instagramData.thumbnail_url;
            if (imageUrl) {
                const cloudinaryUrl = await uploadToCloudinary(imageUrl);
                if (cloudinaryUrl) imageUrl = cloudinaryUrl;
            }

            const isVideo = url.includes('/reel/') || instagramData.html?.includes('video');
            const videoUrl = isVideo ? (instagramData.media_url || '') : '';

            const { data: post, error } = await supabase.from('posts').insert({
                instagram_url: url,
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
            }).select().single();

            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Post added successfully!', post: post });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to add post: ' + error.message });
        }
    }

    if (req.method === 'PUT') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id, caption, writer, article_url, published_at } = req.body || {};
            if (!id) return res.status(400).json({ error: 'Post ID is required' });

            const updates = {};
            if (caption !== undefined) updates.caption = caption;
            if (writer !== undefined) updates.writer = writer;
            if (article_url !== undefined) updates.article_url = article_url;
            if (published_at !== undefined) updates.published_at = published_at;
            updates.updated_at = new Date().toISOString();

            const { data: post, error } = await supabase.from('posts').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Post updated successfully!', post: post });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to update post: ' + error.message });
        }
    }

    if (req.method === 'DELETE') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id } = req.body || {};
            if (!id) return res.status(400).json({ error: 'Post ID is required' });
            const { error } = await supabase.from('posts').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Post deleted successfully!' });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete post: ' + error.message });
        }
    }
}

// WORK ITEMS
async function handleWorkItems(req, res) {
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase.from('work_items').select('*').order('display_order', { ascending: true });
            if (error) throw error;
            return res.status(200).json({ success: true, items: data || [] });
        } catch (error) {
            return res.status(200).json({ success: true, items: [] });
        }
    }

    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        try {
            const { title, description, media_url, media_type, category, display_order, featured } = req.body || {};
            if (!title || !media_url) return res.status(400).json({ error: 'Title and media URL are required' });

            const { data, error } = await supabase.from('work_items').insert({
                title, description: description || '', media_url, media_type: media_type || 'image',
                category: category || '', display_order: display_order || 0, featured: featured || false,
                published_at: new Date().toISOString()
            }).select().single();

            if (error) throw error;
            return res.status(200).json({ success: true, item: data });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to add work item: ' + error.message });
        }
    }

    if (req.method === 'PUT') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id, title, description, media_url, media_type, category, display_order, featured } = req.body || {};
            if (!id) return res.status(400).json({ error: 'ID is required' });

            const updates = {};
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (media_url !== undefined) updates.media_url = media_url;
            if (media_type !== undefined) updates.media_type = media_type;
            if (category !== undefined) updates.category = category;
            if (display_order !== undefined) updates.display_order = display_order;
            if (featured !== undefined) updates.featured = featured;
            updates.updated_at = new Date().toISOString();

            const { data, error } = await supabase.from('work_items').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json({ success: true, item: data });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to update work item: ' + error.message });
        }
    }

    if (req.method === 'DELETE') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id } = req.body || {};
            if (!id) return res.status(400).json({ error: 'ID is required' });
            const { error } = await supabase.from('work_items').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Work item deleted!' });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete work item: ' + error.message });
        }
    }
}

// MEDIA KIT
async function handleMediaKit(req, res) {
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase.from('media_kit').select('url').order('created_at', { ascending: false }).limit(1).single();
            if (error && error.code !== 'PGRST116') throw error;
            return data && data.url ? res.status(200).json({ success: true, url: data.url }) : res.status(200).json({ error: 'No media kit found' });
        } catch (error) {
            return res.status(200).json({ error: 'Failed to fetch media kit' });
        }
    }

    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        try {
            const { url } = req.body || {};
            if (!url) return res.status(400).json({ error: 'URL is required' });
            try { new URL(url); } catch (e) { return res.status(400).json({ error: 'Invalid URL format' }); }

            const { data: existing } = await supabase.from('media_kit').select('id').limit(1).single();
            let result;
            if (existing) {
                result = await supabase.from('media_kit').update({ url, updated_at: new Date().toISOString() }).eq('id', existing.id);
            } else {
                result = await supabase.from('media_kit').insert({ url });
            }
            if (result.error) throw result.error;
            return res.status(200).json({ success: true, message: 'Media Kit URL saved successfully!', url });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to save media kit: ' + error.message });
        }
    }
}

// IMPACT NUMBERS
async function handleImpactNumbers(req, res) {
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase.from('impact_numbers').select('*').limit(1).single();
            if (error && error.code !== 'PGRST116') throw error;
            return res.status(200).json({
                success: true,
                data: data || { magazine: 8, features: 100, collaborations: 50, reach: 1000000 }
            });
        } catch (error) {
            return res.status(200).json({ success: true, data: { magazine: 8, features: 100, collaborations: 50, reach: 1000000 } });
        }
    }

    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        try {
            const { magazine, features, collaborations, reach } = req.body || {};
            const { data: existing } = await supabase.from('impact_numbers').select('id').limit(1).single();
            let result;
            if (existing) {
                result = await supabase.from('impact_numbers')
                    .update({ magazine: magazine || 8, features: features || 100, collaborations: collaborations || 50, reach: reach || 1000000, updated_at: new Date().toISOString() })
                    .eq('id', existing.id)
                    .select()
                    .single();
            } else {
                result = await supabase.from('impact_numbers')
                    .insert({ magazine: magazine || 8, features: features || 100, collaborations: collaborations || 50, reach: reach || 1000000 })
                    .select()
                    .single();
            }
            if (result.error) throw result.error;
            return res.status(200).json({ success: true, message: 'Impact numbers saved!', data: result.data });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to save impact numbers: ' + error.message });
        }
    }
}

// ARTICLES
async function handleArticles(req, res) {
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return res.status(200).json({ articles: data || [] });
        } catch (error) {
            return res.status(200).json({ articles: [] });
        }
    }

    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        try {
            const { postId, articleUrl } = req.body || {};
            if (!postId || !articleUrl) return res.status(400).json({ error: 'postId and articleUrl are required' });
            const { error } = await supabase.from('articles').insert({ post_id: postId, article_url: articleUrl });
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Article added!' });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to add article' });
        }
    }

    if (req.method === 'DELETE') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id } = req.body || {};
            if (!id) return res.status(400).json({ error: 'ID is required' });
            const { error } = await supabase.from('articles').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Article deleted!' });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete article' });
        }
    }
}

// VERIFY PIN
async function handleVerifyPin(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { pin } = req.body || {};
        if (!pin) return res.status(400).json({ error: 'PIN is required' });

        const { data, error } = await supabase.from('settings').select('value').eq('key', 'dashboard_pin').single();
        if (error) {
            const isCorrect = pin === '3689';
            return res.status(200).json({ success: isCorrect, error: isCorrect ? null : 'Invalid PIN' });
        }
        const isCorrect = pin === data.value;
        return res.status(200).json({ success: isCorrect, error: isCorrect ? null : 'Invalid PIN' });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Server error' });
    }
}

// UPDATE PIN
async function handleUpdatePin(req, res) {
    if (!requireAdmin(req, res)) return;
    try {
        const { currentPin, newPin } = req.body || {};
        if (!currentPin || !newPin) return res.status(400).json({ error: 'Current PIN and new PIN are required' });
        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
        }

        const { data: currentData, error: fetchError } = await supabase.from('settings').select('value').eq('key', 'dashboard_pin').single();
        if (fetchError) return res.status(500).json({ error: 'Failed to verify current PIN' });
        if (currentPin !== currentData.value) return res.status(401).json({ error: 'Current PIN is incorrect' });

        const { error: updateError } = await supabase.from('settings').update({ value: newPin, updated_at: new Date().toISOString() }).eq('key', 'dashboard_pin');
        if (updateError) return res.status(500).json({ error: 'Failed to update PIN' });
        return res.status(200).json({ success: true, message: 'PIN updated successfully!' });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
}

// POSTS SYNC
async function handlePostsSync(req, res) {
    if (!requireAdmin(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    try {
        const { feed_id = 'qBmSl39X4hdPVipZS1UR' } = req.body || {};
        const FEED_URL = `https://feeds.behold.so/${feed_id}`;

        const response = await fetch(FEED_URL);
        if (!response.ok) throw new Error('Failed to fetch Instagram feed');
        const data = await response.json();
        const posts = data.posts || data;
        if (!posts || posts.length === 0) {
            return res.status(200).json({ success: true, message: 'No posts found in feed', synced: 0, skipped: 0 });
        }

        let synced = 0, skipped = 0;
        const errors = [];

        for (const post of posts) {
            try {
                const postId = post.id || post.postId || '';
                if (!postId) { skipped++; continue; }

                const { data: existing } = await supabase.from('posts').select('id').eq('post_id', postId).single();
                if (existing) { skipped++; continue; }

                let imageUrl = '';
                if (post.sizes?.large?.mediaUrl) imageUrl = post.sizes.large.mediaUrl;
                else if (post.mediaUrl) imageUrl = post.mediaUrl;
                else if (post.sizes?.medium?.mediaUrl) imageUrl = post.sizes.medium.mediaUrl;

                if (post.mediaType === 'CAROUSEL_ALBUM' && post.children?.length > 0) {
                    const child = post.children[0];
                    if (child.sizes?.large?.mediaUrl) imageUrl = child.sizes.large.mediaUrl;
                    else if (child.mediaUrl) imageUrl = child.mediaUrl;
                }

                let cloudinaryUrl = '';
                if (imageUrl) {
                    cloudinaryUrl = await uploadToCloudinary(imageUrl);
                }

                const isVideo = post.mediaType === 'VIDEO' || post.isReel === true;
                const videoUrl = isVideo ? (post.mediaUrl || '') : '';
                const caption = post.prunedCaption || post.caption || '';
                const permalink = post.permalink || `https://www.instagram.com/p/${postId}/`;

                const { error } = await supabase.from('posts').insert({
                    post_id: postId,
                    image_url: cloudinaryUrl || imageUrl || '',
                    caption: caption,
                    permalink: permalink,
                    writer: '100 HUB',
                    is_video: isVideo,
                    video_url: videoUrl,
                    published_at: post.timestamp ? new Date(post.timestamp).toISOString() : new Date().toISOString(),
                    status: 'published'
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
            synced, skipped, total: posts.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to sync posts: ' + error.message });
    }
}

// ==========================================
// MAIN HANDLER
// ==========================================
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const { path } = req.query;

    switch (path) {
        case 'members':
            return handleMembers(req, res);
        case 'signup':
            return handleSignup(req, res);
        case 'update-member':
            return handleUpdateMember(req, res);
        case 'partners':
            return handlePartners(req, res);
        case 'posts':
            return handlePosts(req, res);
        case 'posts-sync':
            return handlePostsSync(req, res);
        case 'work-items':
            return handleWorkItems(req, res);
        case 'media-kit':
            return handleMediaKit(req, res);
        case 'impact-numbers':
            return handleImpactNumbers(req, res);
        case 'articles':
            return handleArticles(req, res);
        case 'verify-pin':
            return handleVerifyPin(req, res);
        case 'update-pin':
            return handleUpdatePin(req, res);
        default:
            return res.status(404).json({ error: `Endpoint '${path}' not found` });
    }
}