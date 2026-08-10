// api/index.js
// Consolidated API - handles all endpoints in one file

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ==========================================
// EMAIL FUNCTIONS
// ==========================================

const EMAIL_FROM = 'noreply@100hub.co.za';
const REPLY_TO_EMAIL = '100projectsmedia@gmail.com';
const ADMIN_EMAIL = '100projectsmedia@gmail.com';

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

async function sendAdminMemberNotification(memberData) {
    const html = `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1A1A1A;">
            <h1 style="font-size:24px;font-weight:700;margin-bottom:16px;">🔔 New Member Application</h1>
            <p style="font-size:16px;color:#4A4A4A;margin-bottom:20px;">A new member has applied to join the 100 HUB community.</p>
            
            <div style="background:#F5F5F5;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
                <p style="margin:0 0 10px;font-size:12px;color:#8A8A8A;text-transform:uppercase;letter-spacing:1px;">Applicant Details</p>
                <p style="margin:4px 0;"><strong>Name:</strong> ${memberData.name}</p>
                <p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${memberData.email}">${memberData.email}</a></p>
                <p style="margin:4px 0;"><strong>Role:</strong> ${memberData.role || 'Not specified'}</p>
                <p style="margin:4px 0;"><strong>Skills:</strong> ${memberData.skills || 'Not specified'}</p>
                ${memberData.website ? `<p style="margin:4px 0;"><strong>Website:</strong> <a href="${memberData.website}" target="_blank">${memberData.website}</a></p>` : ''}
                ${memberData.social_platform && memberData.social_handle ? `<p style="margin:4px 0;"><strong>Social:</strong> ${memberData.social_platform} - @${memberData.social_handle}</p>` : ''}
            </div>
            
            <p style="font-size:14px;color:#4A4A4A;line-height:1.7;">
                <a href="https://100hub.co.za/dashboard" style="color:#E31E24;font-weight:600;">View in Dashboard →</a>
            </p>
            
            <hr style="border:none;border-top:1px solid #E8E4DE;margin:32px 0;" />
            <p style="font-size:12px;color:#B8B0A8;">100 HUB · Broadcasting &amp; Media Production Company</p>
        </div>
    `;
    await sendEmail({
        to: ADMIN_EMAIL,
        subject: '🔔 New Member Application - 100 HUB',
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

async function sendSubscriptionConfirmation(email) {
    const html = `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1A1A1A;">
            <h1 style="font-size:26px;font-weight:700;margin-bottom:8px;">✅ You're Subscribed!</h1>
            <p style="font-size:16px;color:#4A4A4A;line-height:1.7;margin-bottom:24px;">
                Thank you for subscribing to the 100 HUB newsletter. You'll receive updates on new projects, events, and creative opportunities.
            </p>
            <div style="background:#F5F5F5;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
                <p style="margin:0 0 10px;font-size:12px;color:#8A8A8A;text-transform:uppercase;letter-spacing:1px;">What to expect</p>
                <ul style="margin:0;padding-left:18px;font-size:14px;color:#4A4A4A;line-height:2;">
                    <li>Monthly newsletter with updates</li>
                    <li>Exclusive event invitations</li>
                    <li>New project announcements</li>
                    <li>Creative opportunities</li>
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
        subject: "✅ You're subscribed to 100 HUB!",
        html
    });
}

async function sendAdminSubscriptionNotification(email) {
    const html = `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1A1A1A;">
            <h1 style="font-size:24px;font-weight:700;margin-bottom:16px;">📬 New Subscriber</h1>
            <p style="font-size:16px;color:#4A4A4A;margin-bottom:20px;">A new user has subscribed to the 100 HUB newsletter.</p>
            <div style="background:#F5F5F5;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
                <p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p style="margin:4px 0;"><strong>Subscribed:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="font-size:14px;color:#4A4A4A;line-height:1.7;">
                <a href="https://100hub.co.za/dashboard" style="color:#E31E24;font-weight:600;">View all subscribers →</a>
            </p>
            <hr style="border:none;border-top:1px solid #E8E4DE;margin:32px 0;" />
            <p style="font-size:12px;color:#B8B0A8;">100 HUB · Broadcasting &amp; Media Production Company</p>
        </div>
    `;
    await sendEmail({
        to: ADMIN_EMAIL,
        subject: '📬 New Subscriber - 100 HUB',
        html
    });
}

// ==========================================
// TOKEN HELPER FUNCTIONS
// ==========================================

function generateToken() {
    const payload = {
        expiresAt: Date.now() + 1000 * 60 * 60 * 4, // 4 hours
        issuedAt: Date.now(),
        version: '1.0'
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
    if (!token) return false;
    
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        if (decoded.expiresAt && Date.now() > decoded.expiresAt) {
            console.log('⏰ Token expired');
            return false;
        }
        return true;
    } catch (e) {
        console.log('❌ Invalid token format:', e.message);
        return false;
    }
}

function requireAdmin(req, res) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    console.log('🔐 Checking token:', token ? 'Present' : 'Missing');
    
    if (!token) {
        console.log('❌ No token provided');
        res.status(401).json({ 
            error: 'Unauthorized',
            message: 'Please unlock the dashboard first'
        });
        return false;
    }
    
    if (!verifyToken(token)) {
        console.log('❌ Invalid token');
        res.status(401).json({ 
            error: 'Unauthorized',
            message: 'Invalid or expired session. Please unlock again.'
        });
        return false;
    }
    
    console.log('✅ Token verified successfully');
    return true;
}

// ==========================================
// CLOUDINARY HELPER FUNCTIONS
// ==========================================

const CLOUDINARY_CLOUD_NAME = 'dfozevcbl';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

function extractCloudinaryPublicId(url) {
    if (!url) return null;
    if (!url.includes('cloudinary.com') && !url.includes('res.cloudinary.com')) {
        return null;
    }
    try {
        const uploadIndex = url.indexOf('/upload/');
        if (uploadIndex === -1) return null;
        let path = url.substring(uploadIndex + 8);
        if (path.startsWith('v') && path.includes('/')) {
            path = path.substring(path.indexOf('/') + 1);
        }
        const extIndex = path.lastIndexOf('.');
        if (extIndex !== -1) {
            path = path.substring(0, extIndex);
        }
        const queryIndex = path.indexOf('?');
        if (queryIndex !== -1) {
            path = path.substring(0, queryIndex);
        }
        return path;
    } catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
}

async function deleteFromCloudinary(url) {
    if (!url) return true;
    const publicId = extractCloudinaryPublicId(url);
    if (!publicId) return true;
    if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        console.warn('⚠️ Cloudinary API credentials not set, cannot delete file');
        return false;
    }
    try {
        const timestamp = Math.round(Date.now() / 1000);
        const signature = crypto
            .createHash('sha256')
            .update(`public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
            .digest('hex');
        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('signature', signature);
        formData.append('api_key', CLOUDINARY_API_KEY);
        formData.append('timestamp', timestamp);
        formData.append('invalidate', 'true');
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
            { method: 'POST', body: formData }
        );
        const result = await response.json();
        if (result.result === 'ok') {
            console.log(`✅ Deleted from Cloudinary: ${publicId}`);
            return true;
        } else {
            console.warn(`⚠️ Cloudinary deletion returned: ${result.result}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Cloudinary deletion error:', error);
        return false;
    }
}

async function deleteMultipleFromCloudinary(urls) {
    const results = { success: 0, failed: 0 };
    for (const url of urls) {
        if (url) {
            const deleted = await deleteFromCloudinary(url);
            if (deleted) results.success++;
            else results.failed++;
        }
    }
    return results;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function uploadToCloudinary(mediaUrl, options = {}) {
    const { publicId = null, resourceType = 'image' } = options;
    try {
        const response = await fetch(mediaUrl);
        if (!response.ok) throw new Error(`Failed to fetch source media (${response.status})`);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimePrefix = resourceType === 'video' ? 'video/mp4' : 'image/jpeg';

        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        const cloudName = 'dfozevcbl';
        const folder = '100 TRUSTEES';
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
        const formData = new FormData();
        formData.append('file', `data:${mimePrefix};base64,${base64}`);
        formData.append('folder', folder);

        if (apiKey && apiSecret) {
            // Signed upload — gives us full control (explicit public_id, no random
            // suffix appended, ok to overwrite) regardless of the unsigned preset's
            // "Unique filename" setting.
            const crypto = await import('crypto');
            const timestamp = Math.floor(Date.now() / 1000);
            const params = {
                folder,
                timestamp,
                overwrite: true,
                unique_filename: false,
                ...(publicId ? { public_id: publicId } : {})
            };
            const toSign = Object.keys(params)
                .sort()
                .map(key => `${key}=${params[key]}`)
                .join('&');
            const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');

            formData.append('timestamp', timestamp);
            formData.append('overwrite', 'true');
            formData.append('unique_filename', 'false');
            if (publicId) formData.append('public_id', publicId);
            formData.append('api_key', apiKey);
            formData.append('signature', signature);
        } else {
            // Fallback: unsigned preset (random suffix risk remains unless the
            // "members" preset itself has "Unique filename" turned off in Cloudinary).
            formData.append('upload_preset', 'members');
            if (publicId) formData.append('public_id', publicId);
        }

        const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
        if (!uploadResponse.ok) {
            const errBody = await uploadResponse.text().catch(() => '');
            throw new Error(`Cloudinary upload failed (${uploadResponse.status}): ${errBody}`);
        }
        const result = await uploadResponse.json();
        return result.secure_url;
    } catch (error) {
        console.error(`Cloudinary ${resourceType} upload error:`, error);
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
            
            const { data: member, error: fetchError } = await supabase
                .from('members')
                .select('image1, image2, image3, selected_image')
                .eq('id', id)
                .single();
            
            if (fetchError) {
                console.error('Error fetching member:', fetchError);
            }
            
            const { error } = await supabase.from('members').delete().eq('id', id);
            if (error) throw error;
            
            if (member) {
                const imageUrls = [
                    member.image1,
                    member.image2,
                    member.image3,
                    member.selected_image
                ].filter(url => url);
                if (imageUrls.length > 0) {
                    console.log(`🗑️ Deleting ${imageUrls.length} images from Cloudinary for member ${id}`);
                    await deleteMultipleFromCloudinary(imageUrls);
                }
            }
            return res.status(200).json({ success: true, message: 'Member deleted successfully!' });
        } catch (error) {
            console.error('Delete member error:', error);
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

        await sendConfirmationEmail(email, name);
        await sendAdminMemberNotification({ name, email, role, skills, website, social_platform: socialPlatform, social_handle: socialHandle });

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
            
            const { data: partner, error: fetchError } = await supabase
                .from('partners')
                .select('url')
                .eq('id', id)
                .single();
            
            if (fetchError) {
                console.error('Error fetching partner:', fetchError);
            }
            
            const { error } = await supabase.from('partners').delete().eq('id', id);
            if (error) throw error;
            
            if (partner && partner.url) {
                console.log(`🗑️ Deleting partner logo from Cloudinary for ${id}`);
                await deleteFromCloudinary(partner.url);
            }
            
            const { data: allPartners } = await supabase.from('partners').select('*').order('created_at', { ascending: true });
            return res.status(200).json({ success: true, logos: allPartners || [] });
        } catch (error) {
            console.error('Delete partner error:', error);
            return res.status(500).json({ error: 'Failed to delete partner: ' + error.message });
        }
    }
}

// SUBSCRIPTIONS
async function handleSubscriptions(req, res) {
    if (req.method === 'GET') {
        if (!requireAdmin(req, res)) return;
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .order('subscribed_at', { ascending: false });
            if (error) throw error;
            return res.status(200).json({ 
                success: true, 
                subscriptions: data || [],
                count: data ? data.length : 0
            });
        } catch (error) {
            return res.status(200).json({ subscriptions: [], count: 0 });
        }
    }

    if (req.method === 'POST') {
        try {
            const { email } = req.body || {};
            if (!email) return res.status(400).json({ error: 'Email is required' });
            if (!email.includes('@')) return res.status(400).json({ error: 'Invalid email format' });

            const { data: existing } = await supabase
                .from('subscriptions')
                .select('email')
                .eq('email', email)
                .single();

            if (existing) {
                return res.status(200).json({ 
                    success: true, 
                    message: 'Already subscribed!',
                    alreadySubscribed: true 
                });
            }

            const { data, error } = await supabase
                .from('subscriptions')
                .insert({ email, status: 'active' })
                .select()
                .single();

            if (error) throw error;

            await sendSubscriptionConfirmation(email);
            await sendAdminSubscriptionNotification(email);

            return res.status(200).json({ 
                success: true, 
                message: 'Successfully subscribed!',
                subscription: data 
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to subscribe: ' + error.message });
        }
    }

    if (req.method === 'DELETE') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id } = req.body || {};
            if (!id) return res.status(400).json({ error: 'ID is required' });
            const { error } = await supabase.from('subscriptions').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Subscriber deleted!' });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete subscriber: ' + error.message });
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
            const { post_id, image_url, caption, permalink, instagram_url, writer, article_url, is_video, video_url, published_at } = req.body || {};
            if (!post_id || !image_url) {
                return res.status(400).json({ error: 'Post ID and image URL are required' });
            }
            const { data: existing } = await supabase.from('posts').select('id').eq('post_id', post_id).single();
            if (existing) return res.status(400).json({ error: 'This post already exists in the database' });
            
            // Generate instagram_url if not provided
            const finalInstagramUrl = instagram_url || permalink || `https://www.instagram.com/p/${post_id}/`;
            
            const { data: post, error } = await supabase.from('posts').insert({
                post_id: post_id,
                image_url: image_url,
                caption: caption || '',
                permalink: permalink || `https://www.instagram.com/p/${post_id}/`,
                instagram_url: finalInstagramUrl,  // ← FIX: Added this required field
                writer: writer || '100 HUB',
                is_video: is_video || false,
                video_url: video_url || '',
                article_url: article_url || '',
                published_at: published_at || new Date().toISOString(),
                status: 'published'
            }).select().single();
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Post added successfully!', post: post });
        } catch (error) {
            console.error('❌ Error adding post:', error);
            return res.status(500).json({ error: 'Failed to add post: ' + error.message });
        }
    }

    if (req.method === 'PUT') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id, caption, writer, article_url, published_at, image_url, video_url } = req.body || {};
            if (!id) return res.status(400).json({ error: 'Post ID is required' });
            const updates = {};
            if (caption !== undefined) updates.caption = caption;
            if (writer !== undefined) updates.writer = writer;
            if (article_url !== undefined) updates.article_url = article_url;
            if (published_at !== undefined) updates.published_at = published_at;
            if (image_url !== undefined) updates.image_url = image_url;
            if (video_url !== undefined) updates.video_url = video_url;
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
            const { data: post, error: fetchError } = await supabase
                .from('posts')
                .select('image_url, video_url')
                .eq('id', id)
                .single();
            if (fetchError) {
                console.error('Error fetching post:', fetchError);
            }
            const { error } = await supabase.from('posts').delete().eq('id', id);
            if (error) throw error;
            if (post) {
                const urls = [post.image_url, post.video_url].filter(url => url);
                if (urls.length > 0) {
                    console.log(`🗑️ Deleting ${urls.length} files from Cloudinary for post ${id}`);
                    await deleteMultipleFromCloudinary(urls);
                }
            }
            return res.status(200).json({ success: true, message: 'Post deleted successfully!' });
        } catch (error) {
            console.error('Delete post error:', error);
            return res.status(500).json({ error: 'Failed to delete post: ' + error.message });
        }
    }
}

// WORK ITEMS
async function handleWorkItems(req, res) {
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('work_items')
                .select('*')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: true });
            if (error) throw error;
            return res.status(200).json({ success: true, items: data || [] });
        } catch (error) {
            return res.status(200).json({ success: true, items: [] });
        }
    }

    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        try {
            const { 
                title, description, media_url, media_type, category, 
                display_order, featured, agency_client, link_url, is_featured_main 
            } = req.body || {};
            if (!title || !media_url) return res.status(400).json({ error: 'Title and media URL are required' });
            const { data, error } = await supabase.from('work_items').insert({
                title, 
                description: description || '', 
                media_url, 
                media_type: media_type || 'image',
                category: category || '', 
                display_order: display_order || 0, 
                featured: featured || false,
                agency_client: agency_client || '',
                link_url: link_url || '',
                is_featured_main: is_featured_main || false,
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
            const { 
                id, title, description, media_url, media_type, category, 
                display_order, featured, agency_client, link_url, is_featured_main 
            } = req.body || {};
            if (!id) return res.status(400).json({ error: 'ID is required' });
            const updates = {};
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (media_url !== undefined) updates.media_url = media_url;
            if (media_type !== undefined) updates.media_type = media_type;
            if (category !== undefined) updates.category = category;
            if (display_order !== undefined) updates.display_order = display_order;
            if (featured !== undefined) updates.featured = featured;
            if (agency_client !== undefined) updates.agency_client = agency_client;
            if (link_url !== undefined) updates.link_url = link_url;
            if (is_featured_main !== undefined) updates.is_featured_main = is_featured_main;
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
            const { data: workItem, error: fetchError } = await supabase
                .from('work_items')
                .select('media_url')
                .eq('id', id)
                .single();
            if (fetchError) {
                console.error('Error fetching work item:', fetchError);
            }
            const { error } = await supabase.from('work_items').delete().eq('id', id);
            if (error) throw error;
            if (workItem && workItem.media_url) {
                console.log(`🗑️ Deleting file from Cloudinary for work item ${id}`);
                await deleteFromCloudinary(workItem.media_url);
            }
            return res.status(200).json({ success: true, message: 'Work item deleted!' });
        } catch (error) {
            console.error('Delete work item error:', error);
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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { pin } = req.body || {};
        if (!pin) {
            return res.status(400).json({ error: 'PIN is required' });
        }
        console.log('🔐 PIN verification attempt');
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'dashboard_pin')
            .single();
        let isCorrect = false;
        if (error) {
            console.log('⚠️ No PIN setting found, using default');
            isCorrect = pin === '3689';
        } else {
            isCorrect = pin === data.value;
        }
        if (!isCorrect) {
            console.log('❌ Incorrect PIN');
            return res.status(200).json({ 
                success: false, 
                error: 'Invalid PIN' 
            });
        }
        const token = generateToken();
        console.log('✅ PIN verified, token generated');
        return res.status(200).json({ 
            success: true, 
            token: token,
            message: 'PIN verified successfully'
        });
    } catch (error) {
        console.error('❌ PIN verification error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
}

// UPDATE PIN
async function handleUpdatePin(req, res) {
    if (!requireAdmin(req, res)) return;
    try {
        const { currentPin, newPin } = req.body || {};
        if (!currentPin || !newPin) {
            return res.status(400).json({ error: 'Current PIN and new PIN are required' });
        }
        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
        }
        const { data: currentData, error: fetchError } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'dashboard_pin')
            .single();
        if (fetchError) {
            return res.status(500).json({ error: 'Failed to verify current PIN' });
        }
        if (currentPin !== currentData.value) {
            return res.status(401).json({ error: 'Current PIN is incorrect' });
        }
        const { error: updateError } = await supabase
            .from('settings')
            .update({ 
                value: newPin, 
                updated_at: new Date().toISOString() 
            })
            .eq('key', 'dashboard_pin');
        if (updateError) {
            return res.status(500).json({ error: 'Failed to update PIN' });
        }
        return res.status(200).json({ 
            success: true, 
            message: 'PIN updated successfully!' 
        });
    } catch (error) {
        console.error('❌ Update PIN error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
}

// ==========================================
// ADS HANDLER - FIXED: Returns ALL ads for admin
// ==========================================

async function handleAds(req, res) {
    if (req.method === 'GET') {
        try {
            // Check if admin is authenticated
            const authHeader = req.headers.authorization || '';
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
            const isAdmin = token && verifyToken(token);
            
            console.log('📬 Ads request - Admin:', isAdmin);
            
            let query = supabase
                .from('ads')
                .select('*')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: true });
            
            // If NOT admin, only return active ads (for public view)
            if (!isAdmin) {
                query = query.eq('is_active', true);
                const { data, error } = await query;
                if (error) throw error;
                const ad = data && data.length > 0 ? data[0] : null;
                console.log('📬 Public ad response:', ad ? ad.id : 'none');
                return res.status(200).json({ success: true, ad });
            }
            
            // ADMIN: Return ALL ads (including inactive)
            const { data, error } = await query;
            if (error) throw error;
            console.log('📬 Admin ads response:', data ? data.length : 0);
            return res.status(200).json({ success: true, ads: data || [] });
            
        } catch (error) {
            console.error('❌ Ads fetch error:', error);
            const authHeader = req.headers.authorization || '';
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
            const isAdmin = token && verifyToken(token);
            if (isAdmin) {
                return res.status(200).json({ success: true, ads: [] });
            } else {
                return res.status(200).json({ success: true, ad: null });
            }
        }
    }

    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        try {
            const { title, media_url, media_type, link_url, is_active, display_order } = req.body || {};
            if (!media_url || !link_url) {
                return res.status(400).json({ error: 'Media URL and link URL are required' });
            }
            const { data, error } = await supabase.from('ads').insert({
                title: title || `Ad ${new Date().toISOString().slice(0, 10)}`,
                media_url,
                media_type: media_type || 'video',
                link_url,
                is_active: is_active !== undefined ? is_active : true,
                display_order: display_order || 0
            }).select().single();
            if (error) throw error;
            return res.status(200).json({ success: true, ad: data });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to add ad: ' + error.message });
        }
    }

    if (req.method === 'PUT') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id, title, media_url, media_type, link_url, is_active, display_order } = req.body || {};
            if (!id) return res.status(400).json({ error: 'ID is required' });
            const updates = {};
            if (title !== undefined) updates.title = title;
            if (media_url !== undefined) updates.media_url = media_url;
            if (media_type !== undefined) updates.media_type = media_type;
            if (link_url !== undefined) updates.link_url = link_url;
            if (is_active !== undefined) updates.is_active = is_active;
            if (display_order !== undefined) updates.display_order = display_order;
            updates.updated_at = new Date().toISOString();
            const { data, error } = await supabase.from('ads').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json({ success: true, ad: data });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to update ad: ' + error.message });
        }
    }

    if (req.method === 'DELETE') {
        if (!requireAdmin(req, res)) return;
        try {
            const { id } = req.body || {};
            if (!id) return res.status(400).json({ error: 'ID is required' });
            const { data: ad, error: fetchError } = await supabase
                .from('ads')
                .select('media_url')
                .eq('id', id)
                .single();
            if (fetchError) {
                console.error('Error fetching ad:', fetchError);
            }
            const { error } = await supabase.from('ads').delete().eq('id', id);
            if (error) throw error;
            if (ad && ad.media_url) {
                await deleteFromCloudinary(ad.media_url);
            }
            const { data: allAds } = await supabase.from('ads').select('*').order('display_order', { ascending: true });
            return res.status(200).json({ success: true, ads: allAds || [] });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete ad: ' + error.message });
        }
    }
}

// ==========================================
// MAIN HANDLER
// ==========================================
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
        case 'subscriptions':
            return handleSubscriptions(req, res);
        case 'posts':
            return handlePosts(req, res);
        case 'ads':
            return handleAds(req, res);
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