require('dotenv').config();
const express = require('express');
const cors = require('cors');

const pdfRoutes = require('./routes/pdf');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/health', healthRoutes);
app.use('/api/pdf', pdfRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`PropAgent backend running on port ${PORT}`);
});
