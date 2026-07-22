// functions/api/update-member.js
// Updates a member in Supabase

import { createClient } from '@supabase/supabase-js';

const EMAIL_FROM = 'noreply@100hub.co.za';
const REPLY_TO_EMAIL = '100projectsmedia@gmail.com';

async function sendEmail({ to, subject, html }, env) {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('RESEND_API_KEY not set — skipping email');
        return;
    }
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
        console.log('Email sent to:', to);
    }
}

export async function onRequest(context) {
    const { request, env } = context;
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST' && request.method !== 'PUT') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers
        });
    }

    try {
        const body = await request.json();
        const { email, status, selectedImage, name, role, skills } = body;

        if (!email) {
            return new Response(JSON.stringify({ error: 'Member email is required' }), {
                status: 400,
                headers
            });
        }

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

        // Get current member data
        const { data: existingMember, error: fetchError } = await supabase
            .from('members')
            .select('name')
            .eq('email', email)
            .single();

        if (fetchError && !existingMember) {
            return new Response(JSON.stringify({ error: 'Member not found' }), {
                status: 404,
                headers
            });
        }

        const updates = {};
        if (status !== undefined) updates.status = status;
        if (selectedImage !== undefined) updates.selected_image = selectedImage;
        if (name !== undefined) updates.name = name;
        if (role !== undefined) updates.role = role;
        if (skills !== undefined) updates.skills = skills;
        updates.updated_at = new Date().toISOString();

        if (Object.keys(updates).length === 0) {
            return new Response(JSON.stringify({ error: 'No fields to update' }), {
                status: 400,
                headers
            });
        }

        const { data: updated, error: updateError } = await supabase
            .from('members')
            .update(updates)
            .eq('email', email)
            .select()
            .single();

        if (updateError) {
            console.error('Supabase update error:', updateError);
            throw new Error('Failed to update member: ' + updateError.message);
        }

        const memberName = name || existingMember?.name || 'Member';

        // Send email when status changes
        if (status === 'accepted') {
            await sendEmail({
                to: email,
                subject: "You've been accepted to 100 HUB 🎉",
                html: `
                    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1A1A1A;">
                        <h1 style="font-size:26px;font-weight:700;margin-bottom:8px;">Welcome to the 100 Family, ${memberName}!</h1>
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
                `
            }, env);
        }

        if (status === 'declined') {
            await sendEmail({
                to: email,
                subject: 'Update on your 100 HUB Application',
                html: `
                    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1A1A1A;">
                        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">Hello ${memberName},</h1>
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
                `
            }, env);
        }

        return new Response(JSON.stringify({ success: true, message: 'Member updated successfully', member: updated }), {
            status: 200,
            headers
        });

    } catch (error) {
        console.error('Update error:', error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to update member: ' + error.message }), {
            status: 500,
            headers
        });
    }
}