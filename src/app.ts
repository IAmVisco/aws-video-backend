import 'dotenv/config';
import express from 'express';
import { router } from './routes';

const port = parseInt(process.env.PORT!, 10) ?? 3000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(router);
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`Running on http://localhost:${port}`);
});

module.exports = app;
