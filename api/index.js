import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

// --- SUPABASE SETUP ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let dbConnectionError = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    dbConnectionError = 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY';
}

const DEFAULT_SCORES = [
    { name: 'Gaia', stage: 10, kills: 999, damage: 50000, carbonSaved: 1000, date: Date.now() },
    { name: 'EcoBot', stage: 5, kills: 150, damage: 12000, carbonSaved: 400, date: Date.now() }
];

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

app.post('/api/leaderboard', async (req, res) => {
    const newScore = req.body;
    if (!newScore || !newScore.name) return res.status(400).json({ error: 'Invalid score data' });

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

export default app;
