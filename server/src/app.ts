import path from 'path';
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

// Serve everything under BASE_PATH: strip the prefix before routing, and send unprefixed visits (old links,
// the domain root) to the prefixed address. /health stays reachable at the root for load balancer checks.
const { basePath } = env;
if (basePath) {
  app.use((req, res, next) => {
    if (req.url === basePath || req.url.startsWith(`${basePath}/`) || req.url.startsWith(`${basePath}?`)) {
      const rest = req.url.slice(basePath.length);
      req.url = rest.startsWith('/') ? rest : `/${rest}`;
      next();
    } else if (req.path === '/health') {
      next();
    } else {
      // 308 keeps the method and body for non-GET requests.
      res.redirect(req.method === 'GET' || req.method === 'HEAD' ? 302 : 308, `${basePath}${req.url}`);
    }
  });
}

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

// When served over plain HTTP (a demo without a certificate), the default CSP's upgrade-insecure-requests
// and HSTS would make browsers request every asset over HTTPS, which then fails.
const httpOnly = process.env.ALLOW_INSECURE_HTTP === 'true';
app.use(
  helmet(
    httpOnly
      ? { hsts: false, contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } } }
      : undefined,
  ),
);
// CORS compares origins, so drop any path from the client URL.
app.use(cors({ origin: new URL(env.clientUrl).origin }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', async (_req, res) => {
  await db.one('SELECT 1');
  res.json({ status: 'ok' });
});

app.use('/api/v1', apiRoutes);

// Serve the built React app when it is bundled alongside the API (the container image does this).
const clientDir = process.env.CLIENT_DIST_DIR ? path.resolve(process.env.CLIENT_DIST_DIR) : null;
if (clientDir) {
  app.use(express.static(clientDir));
  app.get(/^\/(?!api\/|health$).*/, (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
