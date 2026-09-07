import cors from 'cors';
import express from 'express';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    nev: 'ICE API',
    verzio: '0.1.0',
  });
});

app.listen(PORT, () => {
  console.log(`ICE backend fut: http://localhost:${PORT}`);
});
