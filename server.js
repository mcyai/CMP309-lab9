import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

const ROBOTS_TXT = ['User-agent: *', 'Disallow: /api/admin', ''].join('\n');

app.get('/hello', (req, res) => {
  res.type('text/plain').send("Hello from mcyai's server");
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(ROBOTS_TXT);
});

app.get('/old-page', (req, res) => {
  res.redirect('/hello');
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
