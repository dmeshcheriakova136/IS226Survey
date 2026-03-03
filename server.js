const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new Database(path.join(__dirname, 'survey.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    q1_relationship TEXT,
    q2_thoughts TEXT,
    q3_body TEXT,
    q4_hardest TEXT,
    q5_coping TEXT,
    q6_slow_down TEXT,
    q6_talking_points TEXT,
    q6_audience TEXT,
    q6_voice_alert TEXT,
    q6_calming_cue TEXT,
    q6_post_summary TEXT,
    q7_magic_fix TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Submit survey
app.post('/api/submit', (req, res) => {
  const d = req.body;

  const stmt = db.prepare(`
    INSERT INTO responses (
      q1_relationship, q2_thoughts, q3_body, q4_hardest, q5_coping,
      q6_slow_down, q6_talking_points, q6_audience,
      q6_voice_alert, q6_calming_cue, q6_post_summary,
      q7_magic_fix
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    stmt.run(
      d.q1 || '',
      JSON.stringify(d.q2 || []),
      JSON.stringify(d.q3 || []),
      JSON.stringify(d.q4 || []),
      JSON.stringify(d.q5 || []),
      d.q6_slow_down || '',
      d.q6_talking_points || '',
      d.q6_audience || '',
      d.q6_voice_alert || '',
      d.q6_calming_cue || '',
      d.q6_post_summary || '',
      d.q7 || ''
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

// View results (simple admin endpoint)
app.get('/api/results', (req, res) => {
  const rows = db.prepare('SELECT * FROM responses ORDER BY submitted_at DESC').all();
  res.json(rows);
});

// Results count
app.get('/api/count', (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM responses').get();
  res.json(row);
});

app.listen(PORT, () => {
  console.log(`Survey running at http://localhost:${PORT}`);
});
