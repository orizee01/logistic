import { app } from './app';
import { env } from './config/env';
import { pgp } from './database/db';
import { verifyMailer } from './utils/mailer';

const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  void verifyMailer();
});

function shutdown(): void {
  server.close(() => {
    pgp.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
