// api/signup.js
// Saves member data to Supabase
// Sends confirmation email via Resend
// NOTE: lives at /api/signup.js at the project ROOT for Vercel to detect it.

import { createClient } from '@supabase/supabase-js';

const EMAIL_FROM = 'noreply@100hub.co.za';
const REPLY_TO_EMAIL = '100projectsmedia@gmail.com';

async function sendConfirmationEmail(email, name) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('RESEND_API_KEY not set — skipping email');
        return;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `100 HUB <${EMAIL_FROM}>`,
                to: [email],
                reply_to: REPLY_TO_EMAIL,
                subject: '✅ Application Received - 100 HUB',
                html: `
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
                `
            })
        });

        if (!response.ok) {
            console.error('❌ Resend email error:', await response.text());
        } else {
            console.log(`✅ Confirmation email sent to ${email}`);
        }
    } catch (error) {
        console.error('❌ Email sending error:', error);
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

    try {
        const { name, email, role, skills, website, image1, image2, image3, socialPlatform, socialHandle } = req.body || {};

        if (!name || !email || !role) {
            return res.status(400).json({ error: 'Name, email, and role are required' });
        }

        // Initialize Supabase client
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

        // Check if email already exists
        const { data: existing } = await supabase
            .from('members')
            .select('email')
            .eq('email', email)
            .single();

        if (existing) {
            return res.status(400).json({ error: 'This email is already registered.' });
        }

        // Insert member
        const { data, error } = await supabase
            .from('members')
            .insert({
                name,
                email,
                role,
                skills: skills || '',
                website: website || '',
                social_platform: socialPlatform || '',
                social_handle: socialHandle || '',
                image1: image1 || '',
                image2: image2 || '',
                image3: image3 || '',
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase insert error:', error);
            throw new Error('Failed to save member: ' + error.message);
        }

        // Send confirmation email
        await sendConfirmationEmail(email, name);

        return res.status(200).json({
            success: true,
            message: 'Successfully joined the community!',
            member: data
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ error: 'Failed to save member data: ' + error.message });
    }
}
