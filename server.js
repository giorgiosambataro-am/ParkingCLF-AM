const express = require('express');
const path = require('path'); // Aggiungi questa riga in alto
const app = express();

// ... (le altre tue configurazioni del database)

app.use(express.json());

// QUESTA È LA RIGA FONDAMENTALE:
app.use(express.static(path.join(__dirname, 'public')));

// Questo dice al server di mandare l'index.html quando visiti il sito
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ... (le tue API tipo app.post('/api/prenota', ...))

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
