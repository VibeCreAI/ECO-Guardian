import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

// --- SUPABASE SETUP ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let dbConnectionError = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    dbConnectionError = 'Missing SUPABASE_URL or SUPABASE_ANON_KEY';
}

// --- RATE LIMITING (max 5 submissions per IP per 10 minutes) ---
// Note: persists across warm serverless invocations on the same instance
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

const mapRow = (row) => ({
    name: row.name,
    stage: row.stage,
    kills: row.kills,
    damage: row.damage,
    carbonSaved: row.carbon_saved,
    date: row.date
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: supabase ? 'supabase' : 'offline', error: dbConnectionError, timestamp: Date.now() });
});

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

app.post('/api/leaderboard', async (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: 'Too many submissions. Please wait before trying again.' });
    }

    const newScore = req.body;
    if (!newScore || !isValidScore(newScore)) return res.status(400).json({ error: 'Invalid score data' });

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

export default app;
