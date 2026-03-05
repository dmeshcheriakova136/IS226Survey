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

// Export CSV
app.get('/api/export-csv', (req, res) => {
  const rows = db.prepare('SELECT * FROM responses ORDER BY submitted_at DESC').all();

  const headers = {
    id: 'ID',
    q1_relationship: 'Q1: Relationship with public speaking',
    q2_thoughts: 'Q2: Thoughts before speaking',
    q3_body: 'Q3: Physical symptoms',
    q4_hardest: 'Q4: Two hardest parts',
    q5_coping: 'Q5: Coping strategies tried',
    q6_slow_down: 'Q6a: Reminders to slow down/breathe',
    q6_talking_points: 'Q6b: Talking points display',
    q6_audience: 'Q6c: Audience reaction read',
    q6_voice_alert: 'Q6d: Voice shaking alert',
    q6_calming_cue: 'Q6e: Calming cue',
    q6_post_summary: 'Q6f: Post-talk summary',
    q7_magic_fix: 'Q7: Magic fix',
    submitted_at: 'Submitted At'
  };

  const jsonCols = ['q2_thoughts', 'q3_body', 'q4_hardest', 'q5_coping'];
  const cols = Object.keys(headers);

  function escapeCSV(val) {
    const str = String(val == null ? '' : val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  const csvRows = [cols.map(c => escapeCSV(headers[c])).join(',')];

  for (const row of rows) {
    csvRows.push(cols.map(c => {
      let val = row[c];
      if (jsonCols.includes(c)) {
        try {
          const arr = JSON.parse(val);
          if (Array.isArray(arr)) val = arr.join('; ');
        } catch {}
      }
      return escapeCSV(val);
    }).join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="survey-responses.csv"');
  res.send(csvRows.join('\n'));
});

// Results count
app.get('/api/count', (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM responses').get();
  res.json(row);
});

app.listen(PORT, () => {
  console.log(`Survey running at http://localhost:${PORT}`);
});
