import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fileUpload from 'express-fileupload';
import { errorHandler } from './middlewares/errors';
import { router } from './routes';

const port = parseInt(process.env.PORT as string, 10) ?? 3000;

const app = express();

app.use(express.json());
app.use(
  cors({ origin: ['http://localhost:5173', 'https://videos.iamvis.co', 'https://visco-aws-videos.netlify.app'] }),
);
app.use(express.urlencoded({ extended: false }));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    safeFileNames: true,
    limits: {
      fileSize: 1024 * 1024 * 1024,
    },
  }),
);

app.use(router);
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Running on http://localhost:${port}`);
});
