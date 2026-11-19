import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { db } from './database/db';
import { openApiSpec } from './docs/openapi';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRoutes } from './routes';

export const app = express();

app.set('trust proxy', 1);

// API docs. Registered before the global helmet() so Swagger UI isn't blocked by the strict CSP.
app.get('/api/docs.json', (_req, res) => {
  res.json(openApiSpec);
});
app.use(
  '/api/docs',
  helmet({ contentSecurityPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'SwiftDrop API Docs',
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.use(helmet());
app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', async (_req, res) => {
  await db.one('SELECT 1');
  res.json({ status: 'ok' });
});

app.use('/api/v1', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
