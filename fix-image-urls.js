// fix-image-urls.js
//
// One-time migration: finds the REAL Cloudinary URL for every post by
// listing everything in the "100 TRUSTEES" folder via Cloudinary's Admin
// Search API, matching each asset back to a post by its numeric post_id
// prefix (e.g. "18417359335176613_jekznf" -> post_id "18417359335176613"),
// then updating image_url on each matching post via your site's API.
//
// WHY THIS WORKS: Cloudinary's random suffix is unguessable (millions of
// combinations), but the post_id prefix is NOT random — it's already in
// both the filename and your database. So instead of guessing suffixes,
// we ask Cloudinary directly what actually exists and match by prefix.
//
// SETUP:
//   1. npm install node-fetch   (skip if on Node 18+, fetch is built in)
//   2. Set the environment variables below (create a .env file or export
//      them in your shell — see the block at the top of main()).
//   3. Run: node fix-image-urls.js
//      (add --dry-run to preview changes without writing anything)
//
// REQUIRED ENV VARS:
//   CLOUDINARY_CLOUD_NAME   (already known: dfozevcbl)
//   CLOUDINARY_API_KEY      (from Cloudinary dashboard, NOT the unsigned preset)
//   CLOUDINARY_API_SECRET   (same place — keep this private, never commit it)
//   SITE_API_BASE           e.g. https://100hub.co.za/api
//   ADMIN_PIN               your dashboard PIN, used to get an auth token
//
// NOTE: The final "save the update" step (postsApiUpdate function near the
// bottom) is written against a REASONABLE GUESS at your posts PUT endpoint
// shape, based on the pattern used elsewhere in your API (id + fields to
// update, Bearer token from verify-pin). Once you send me your actual
// index.js, I'll confirm/fix this function to match exactly — don't run
// this against production until that's confirmed, run with --dry-run first.

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dfozevcbl';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const SITE_API_BASE = process.env.SITE_API_BASE; // e.g. https://100hub.co.za/api
const ADMIN_PIN = process.env.ADMIN_PIN;
const CLOUDINARY_FOLDER = '100 TRUSTEES';
const DRY_RUN = process.argv.includes('--dry-run');

function assertEnv() {
    const missing = [];
    if (!CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
    if (!CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');
    if (!SITE_API_BASE) missing.push('SITE_API_BASE');
    if (!ADMIN_PIN) missing.push('ADMIN_PIN');
    if (missing.length) {
        console.error('❌ Missing required environment variables:', missing.join(', '));
        console.error('   Set these before running, e.g.:');
        console.error('   CLOUDINARY_API_KEY=xxx CLOUDINARY_API_SECRET=xxx SITE_API_BASE=https://100hub.co.za/api ADMIN_PIN=1234 node fix-image-urls.js --dry-run');
        process.exit(1);
    }
}

// ---- Step 1: List every asset in the Cloudinary folder (paginated) ----
async function listAllCloudinaryAssets() {
    const assets = [];
    let cursor = undefined;
    const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');

    do {
        const body = {
            expression: `folder:"${CLOUDINARY_FOLDER}"`,
            max_results: 500,
            ...(cursor ? { next_cursor: cursor } : {})
        };

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/search`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`Cloudinary search failed (${res.status}): ${errText}`);
        }

        const data = await res.json();
        assets.push(...(data.resources || []));
        cursor = data.next_cursor;
        console.log(`  Fetched ${assets.length} assets so far...`);
    } while (cursor);

    return assets;
}

// ---- Step 2: Match assets back to post_ids by numeric prefix ----
function buildPostIdMap(assets) {
    const map = new Map(); // post_id -> secure_url
    const unmatchedAssets = [];

    for (const asset of assets) {
        // public_id looks like "100 TRUSTEES/18417359335176613_jekznf"
        const filename = asset.public_id.split('/').pop();
        const match = filename.match(/^(\d{10,})_/); // Instagram post_ids are long numeric strings
        if (match) {
            const postId = match[1];
            // If duplicates exist, keep the most recently created one
            const existing = map.get(postId);
            if (!existing || new Date(asset.created_at) > new Date(existing.created_at)) {
                map.set(postId, { url: asset.secure_url, created_at: asset.created_at });
            }
        } else {
            unmatchedAssets.push(asset.public_id);
        }
    }

    if (unmatchedAssets.length) {
        console.log(`\n⚠️  ${unmatchedAssets.length} Cloudinary assets didn't match the post_id pattern (probably member photos / partner logos mixed into the same folder — expected, not an error):`);
        unmatchedAssets.slice(0, 5).forEach(id => console.log(`   - ${id}`));
        if (unmatchedAssets.length > 5) console.log(`   ...and ${unmatchedAssets.length - 5} more`);
    }

    const finalMap = new Map();
    for (const [postId, data] of map.entries()) {
        finalMap.set(postId, data.url);
    }
    return finalMap;
}

// ---- Step 3: Get an admin auth token the same way your dashboard does ----
async function getAdminToken() {
    const res = await fetch(`${SITE_API_BASE}?path=verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: ADMIN_PIN })
    });
    const data = await res.json();
    if (!data.success || !data.token) {
        throw new Error('PIN verification failed — check ADMIN_PIN and SITE_API_BASE');
    }
    return data.token;
}

// ---- Step 4: Fetch all posts from your database (paginated) ----
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

        if (posts.length < limit) break; // last page
        page++;
    }

    return allPosts;
}

// ---- Step 5: Save the corrected URL back ----
// Confirmed against the real handlePosts PUT handler: matches by internal
// Supabase `id`, and (as of this script) accepts image_url/video_url.
async function updatePostImageUrl(token, post, newUrl) {
    const res = await fetch(`${SITE_API_BASE}?path=posts`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            id: post.id,
            image_url: newUrl
        })
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Update failed for post ${post.post_id} (${res.status}): ${errText}`);
    }
    return res.json();
}

async function main() {
    assertEnv();
    console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be saved\n' : '🚀 LIVE RUN — changes will be saved\n');

    console.log('Step 1: Listing all Cloudinary assets in "100 TRUSTEES"...');
    const assets = await listAllCloudinaryAssets();
    console.log(`✅ Found ${assets.length} total assets.\n`);

    console.log('Step 2: Matching assets to post_ids...');
    const urlMap = buildPostIdMap(assets);
    console.log(`✅ Matched ${urlMap.size} unique post_ids.\n`);

    console.log('Step 3: Getting admin token...');
    const token = await getAdminToken();
    console.log('✅ Authenticated.\n');

    console.log('Step 4: Fetching all posts from database...');
    const posts = await fetchAllPosts(token);
    console.log(`✅ Found ${posts.length} posts in database.\n`);

    console.log('Step 5: Checking each post against Cloudinary matches...\n');
    let fixed = 0, alreadyCorrect = 0, noMatch = 0, failed = 0;
    const noMatchList = [];

    for (const post of posts) {
        const correctUrl = urlMap.get(String(post.post_id));
        if (!correctUrl) {
            noMatch++;
            noMatchList.push(post.post_id);
            continue;
        }
        if (post.image_url === correctUrl) {
            alreadyCorrect++;
            continue;
        }

        console.log(`  Fixing post ${post.post_id}:`);
        console.log(`    old: ${post.image_url}`);
        console.log(`    new: ${correctUrl}`);

        if (!DRY_RUN) {
            try {
                await updatePostImageUrl(token, post, correctUrl);
                fixed++;
            } catch (err) {
                console.error(`    ❌ ${err.message}`);
                failed++;
            }
        } else {
            fixed++; // would-be fixed, for dry-run reporting
        }
    }

    console.log('\n========== SUMMARY ==========');
    console.log(`${DRY_RUN ? 'Would fix' : 'Fixed'}: ${fixed}`);
    console.log(`Already correct: ${alreadyCorrect}`);
    console.log(`No Cloudinary match found: ${noMatch}`);
    if (failed) console.log(`Failed to save: ${failed}`);
    if (noMatchList.length) {
        console.log(`\nPosts with no match (may need re-uploading):`);
        noMatchList.slice(0, 20).forEach(id => console.log(`  - ${id}`));
        if (noMatchList.length > 20) console.log(`  ...and ${noMatchList.length - 20} more`);
    }
    if (DRY_RUN) {
        console.log('\nThis was a dry run — nothing was saved. Re-run without --dry-run to apply.');
    }
}

main().catch(err => {
    console.error('\n❌ Script failed:', err.message);
    process.exit(1);
});
