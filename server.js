import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

// Load .env.local for local development (no-op on Vercel where vars are injected)
loadEnv({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT) || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

// --- SUPABASE SETUP ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let dbConnectionError = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized.');
} else {
    dbConnectionError = 'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.';
    console.warn('Supabase not configured. Leaderboard API unavailable.');
}

// --- RATE LIMITING (max 5 submissions per IP per 10 minutes) ---
const submitRateMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const checkRateLimit = (ip) => {
    const now = Date.now();
    const entry = submitRateMap.get(ip) || { count: 0, windowStart: now };
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        entry.count = 0;
        entry.windowStart = now;
    }
    entry.count += 1;
    submitRateMap.set(ip, entry);
    return entry.count <= RATE_LIMIT_MAX;
};

// --- SCORE VALIDATION ---
const MAX_STAGES = 20;
const MAX_CARBON = 500000;
const MAX_KILLS = 10000;
const MAX_DAMAGE = 10000000;

const isValidScore = (score) =>
    typeof score.name === 'string' && score.name.trim().length > 0 &&
    Number.isFinite(score.stage) && score.stage >= 1 && score.stage <= MAX_STAGES &&
    Number.isFinite(score.carbonSaved) && score.carbonSaved >= 0 && score.carbonSaved <= MAX_CARBON &&
    Number.isFinite(score.kills) && score.kills >= 0 && score.kills <= MAX_KILLS &&
    Number.isFinite(score.damage) && score.damage >= 0 && score.damage <= MAX_DAMAGE;

// Map Supabase snake_case row to frontend camelCase shape
const mapRow = (row) => ({
    name: row.name,
    stage: row.stage,
    kills: row.kills,
    damage: row.damage,
    carbonSaved: row.carbon_saved,
    date: row.date
});

// --- API ROUTES ---

// GET Health / DB Status
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: supabase ? 'supabase' : 'offline',
        error: dbConnectionError,
        timestamp: Date.now()
    });
});

// GET Leaderboard
app.get('/api/leaderboard', async (req, res) => {
    if (!supabase) return res.json([]);

    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('*')
            .order('carbon_saved', { ascending: false })
            .limit(50);

        if (error) throw error;

        return res.json(data.map(mapRow));
    } catch (e) {
        console.error('Supabase Read Error:', e.message);
        return res.json([]);
    }
});

// POST Score
app.post('/api/leaderboard', async (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: 'Too many submissions. Please wait before trying again.' });
    }

    const newScore = req.body;

    if (!newScore || !isValidScore(newScore)) {
        return res.status(400).json({ error: 'Invalid score data' });
    }

    const entry = {
        name: String(newScore.name).substring(0, 10),
        stage: Number(newScore.stage) || 1,
        kills: Number(newScore.kills) || 0,
        damage: Number(newScore.damage) || 0,
        carbon_saved: Number(newScore.carbonSaved) || 0,
        date: Date.now()
    };

    if (!supabase) return res.status(503).json({ error: 'Database not configured' });

    try {
        await supabase.from('leaderboard').insert(entry);

        const { data, error } = await supabase
            .from('leaderboard')
            .select('*')
            .order('carbon_saved', { ascending: false })
            .limit(50);

        if (error) throw error;

        return res.json(data.map(mapRow));
    } catch (e) {
        console.error('Supabase Write Error:', e.message);
        return res.status(500).json({ error: 'Failed to save score' });
    }
});

// Catch-all handler for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
