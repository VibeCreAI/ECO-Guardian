import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT) || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

// --- SUPABASE SETUP ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let dbConnectionError = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized.');
} else {
    dbConnectionError = 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.';
    console.warn('Supabase not configured. Leaderboard API will return default scores.');
}

const DEFAULT_SCORES = [
    { name: 'Gaia', stage: 10, kills: 999, damage: 50000, carbonSaved: 1000, date: Date.now() },
    { name: 'EcoBot', stage: 5, kills: 150, damage: 12000, carbonSaved: 400, date: Date.now() }
];

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
    if (!supabase) return res.json(DEFAULT_SCORES);

    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('*')
            .order('carbon_saved', { ascending: false })
            .limit(50);

        if (error) throw error;

        const scores = data.map(mapRow);
        return res.json(scores.length ? scores : DEFAULT_SCORES);
    } catch (e) {
        console.error('Supabase Read Error:', e.message);
        return res.json(DEFAULT_SCORES);
    }
});

// POST Score
app.post('/api/leaderboard', async (req, res) => {
    const newScore = req.body;

    if (!newScore || !newScore.name) {
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

    if (!supabase) return res.json(DEFAULT_SCORES);

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
        return res.json(DEFAULT_SCORES);
    }
});

// Catch-all handler for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
