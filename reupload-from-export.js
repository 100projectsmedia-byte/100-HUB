// reupload-from-export.js
//
// The actual fix. We confirmed posts.json's media filenames (e.g.
// "media/posts/18171325309435043.jpg") match your database post_ids
// exactly — 20/20 sampled posts matched. So instead of trying to guess
// which already-uploaded, randomly-named Cloudinary file belongs to which
// post, this re-uploads the ORIGINAL files straight from your Instagram
// export, setting an explicit public_id = post_id on the way in. That
// makes the resulting URL deterministic and correct from the start —
// no more guessing, ever, for these 29 posts.
//
// (Note: posts_1.json is NOT used here — it contains 320 individual
// carousel slide images with their own internal media IDs, not post_ids,
// so it doesn't match your database at all and isn't needed for this.)
//
// SETUP:
//   1. Extract your Instagram export zip somewhere on disk if you haven't
//      already (don't just point this at the zip file itself).
//   2. Add EXPORT_ROOT to your existing .env — the folder that directly
//      contains "posts.json" and the "media" folder as siblings, e.g.:
//        EXPORT_ROOT=C:\Users\shaun\Downloads\instagram-100projectsmedia
//   3. Copy posts.json into that same EXPORT_ROOT folder if it isn't
//      already there (it should be, from the export).
//   4. Your existing .env already has CLOUDINARY_API_KEY,
//      CLOUDINARY_API_SECRET, SITE_API_BASE, ADMIN_PIN — nothing else
//      new needed besides EXPORT_ROOT.
//
// RUN:
//   node --env-file=.env reupload-from-export.js --dry-run
//   node --env-file=.env reupload-from-export.js          (once happy)

const fs = require('fs');
const path = require('path');

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dfozevcbl';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const SITE_API_BASE = process.env.SITE_API_BASE;
const ADMIN_PIN = process.env.ADMIN_PIN;
const EXPORT_ROOT = process.env.EXPORT_ROOT;
const CLOUDINARY_FOLDER = 'posts';
const DRY_RUN = process.argv.includes('--dry-run');

// Meta's export structure varies — posts.json sometimes sits at the top
// level of the extracted folder, and sometimes nested under
// your_instagram_activity/media/. Either way, the actual binary photo/video
// files live in a top-level "media" folder (e.g. EXPORT_ROOT/media/posts/...),
// which is what posts.json's relative URIs are written against. So we
// search a few known locations for posts.json, but always resolve the
// actual media files relative to EXPORT_ROOT itself.
function findPostsJsonPath() {
    const candidates = [
        path.join(EXPORT_ROOT, 'posts.json'),
        path.join(EXPORT_ROOT, 'your_instagram_activity', 'media', 'posts.json'),
        path.join(EXPORT_ROOT, 'your_instagram_activity', 'content', 'posts.json')
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

function assertEnv() {
    const missing = [];
    if (!CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
    if (!CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');
    if (!SITE_API_BASE) missing.push('SITE_API_BASE');
    if (!ADMIN_PIN) missing.push('ADMIN_PIN');
    if (!EXPORT_ROOT) missing.push('EXPORT_ROOT');
    if (missing.length) {
        console.error('❌ Missing required environment variables:', missing.join(', '));
        process.exit(1);
    }
    if (!findPostsJsonPath()) {
        console.error(`❌ Could not find posts.json anywhere under EXPORT_ROOT (${EXPORT_ROOT})`);
        console.error('   Checked: EXPORT_ROOT/posts.json, EXPORT_ROOT/your_instagram_activity/media/posts.json, EXPORT_ROOT/your_instagram_activity/content/posts.json');
        console.error('   Set EXPORT_ROOT to the TOP-LEVEL extracted export folder (the one that contains "media" and "your_instagram_activity" as siblings).');
        process.exit(1);
    }
    if (!fs.existsSync(path.join(EXPORT_ROOT, 'media'))) {
        console.error(`⚠️  Warning: no "media" folder found directly inside EXPORT_ROOT (${EXPORT_ROOT}).`);
        console.error('   The actual image/video files are expected there. Double check EXPORT_ROOT points to the top-level extracted folder.');
    }
}

// ---- Extract {post_id, localFilePath, caption} from posts.json ----
function readPostsFromExport() {
    const postsJsonPath = findPostsJsonPath();
    console.log(`  Using posts.json at: ${postsJsonPath}`);
    const raw = fs.readFileSync(postsJsonPath, 'utf8');
    const data = JSON.parse(raw);
    const entries = [];

    for (const post of data) {
        const mediaList = [];
        if (post.media && post.media.length) mediaList.push(...post.media);
        for (const lv of post.label_values || []) {
            if (lv.label === 'Media' && lv.media) mediaList.push(...lv.media);
        }

        for (const m of mediaList) {
            if (!m.uri) continue;
            const filename = path.basename(m.uri); // "18171325309435043.jpg"
            const postId = filename.split('.')[0];
            if (!/^\d{10,}$/.test(postId)) continue; // skip anything not matching the post_id pattern
            entries.push({
                postId,
                localPath: path.join(EXPORT_ROOT, m.uri.replace(/\//g, path.sep)),
                caption: (m.title || '').trim(),
                ext: path.extname(filename).toLowerCase()
            });
        }
    }
    return entries;
}

// ---- Signed upload of a LOCAL file with explicit public_id ----
async function uploadLocalFileToCloudinary(localPath, publicId, resourceType) {
    const fileBuffer = fs.readFileSync(localPath);
    const base64 = fileBuffer.toString('base64');
    const mimePrefix = resourceType === 'video' ? 'video/mp4' : 'image/jpeg';

    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
        folder: CLOUDINARY_FOLDER,
        overwrite: true,
        public_id: publicId,
        timestamp,
        unique_filename: false
    };
    const toSign = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
    const signature = crypto.createHash('sha1').update(toSign + CLOUDINARY_API_SECRET).digest('hex');

    const formData = new FormData();
    formData.append('file', `data:${mimePrefix};base64,${base64}`);
    formData.append('folder', CLOUDINARY_FOLDER);
    formData.append('overwrite', 'true');
    formData.append('public_id', publicId);
    formData.append('timestamp', String(timestamp));
    formData.append('unique_filename', 'false');
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
        method: 'POST',
        body: formData
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Cloudinary upload failed (${res.status}): ${errText}`);
    }
    const result = await res.json();
    return result.secure_url;
}

async function getAdminToken() {
    const res = await fetch(`${SITE_API_BASE}?path=verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: ADMIN_PIN })
    });
    const data = await res.json();
    if (!data.success || !data.token) throw new Error('PIN verification failed');
    return data.token;
}

async function fetchAllPosts(token) {
    const allPosts = [];
    let page = 1;
    const limit = 100;
    while (true) {
        const res = await fetch(`${SITE_API_BASE}?path=posts&page=${page}&limit=${limit}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Failed to fetch posts page ${page} (${res.status})`);
        const data = await res.json();
        const posts = data.posts || [];
        allPosts.push(...posts);
        if (posts.length < limit) break;
        page++;
    }
    return allPosts;
}

async function updatePostImageUrl(token, internalId, newUrl) {
    const res = await fetch(`${SITE_API_BASE}?path=posts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: internalId, image_url: newUrl })
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Update failed (${res.status}): ${errText}`);
    }
    return res.json();
}

async function main() {
    assertEnv();
    console.log(DRY_RUN ? '🔍 DRY RUN — no uploads or database writes\n' : '🚀 LIVE RUN — uploading and saving\n');

    console.log('Reading posts.json...');
    const exportEntries = readPostsFromExport();
    console.log(`✅ Found ${exportEntries.length} media entries with post_id-pattern filenames.\n`);

    console.log('Getting admin token and fetching database posts...');
    const token = await getAdminToken();
    const dbPosts = await fetchAllPosts(token);
    const dbByPostId = new Map(dbPosts.map(p => [String(p.post_id), p]));
    console.log(`✅ Found ${dbPosts.length} posts in database.\n`);

    let uploaded = 0, missingLocalFile = 0, noDbMatch = 0, failed = 0;

    for (const entry of exportEntries) {
        const dbPost = dbByPostId.get(entry.postId);
        if (!dbPost) {
            console.log(`⚠️  post_id ${entry.postId} exists in export but not in database — skipping`);
            noDbMatch++;
            continue;
        }

        if (!fs.existsSync(entry.localPath)) {
            console.log(`⚠️  Local file missing for post_id ${entry.postId}: ${entry.localPath}`);
            missingLocalFile++;
            continue;
        }

        const isVideo = ['.mp4', '.mov'].includes(entry.ext);
        console.log(`Processing post_id ${entry.postId} (${entry.ext}${isVideo ? ', video' : ''})...`);

        if (DRY_RUN) {
            console.log(`  Would upload: ${entry.localPath}`);
            console.log(`  Would set image_url on post internal id: ${dbPost.id}`);
            uploaded++;
            continue;
        }

        try {
            const resourceType = isVideo ? 'video' : 'image';
            const newUrl = await uploadLocalFileToCloudinary(entry.localPath, entry.postId, resourceType);
            console.log(`  ✅ Uploaded: ${newUrl}`);

            const updatePayload = isVideo
                ? { id: dbPost.id, video_url: newUrl }
                : { id: dbPost.id, image_url: newUrl };
            await fetch(`${SITE_API_BASE}?path=posts`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updatePayload)
            });
            console.log(`  ✅ Database updated.\n`);
            uploaded++;
        } catch (err) {
            console.error(`  ❌ ${err.message}\n`);
            failed++;
        }
    }

    console.log('========== SUMMARY ==========');
    console.log(`${DRY_RUN ? 'Would process' : 'Uploaded + saved'}: ${uploaded}`);
    console.log(`Missing local file: ${missingLocalFile}`);
    console.log(`No matching database post: ${noDbMatch}`);
    if (failed) console.log(`Failed: ${failed}`);
    if (DRY_RUN) console.log('\nDry run only — re-run without --dry-run to actually upload and save.');
}

main().catch(err => {
    console.error('\n❌ Script failed:', err.message);
    process.exit(1);
});
