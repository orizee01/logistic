// Renders every email template with sample data and opens them in the browser.
// Usage: npm run email:preview
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { activationEmail, passwordSetEmail, signInNotificationEmail } from '../utils/emailTemplates';

const outDir = path.join(os.tmpdir(), 'swiftdrop-email-previews');
fs.mkdirSync(outDir, { recursive: true });

const previews = {
  'sign-in-notification': signInNotificationEmail({
    name: 'Ada Okafor',
    email: 'ada@example.com',
    when: 'Thursday, 29 October 2026 at 09:41 GMT+1',
    device: 'Chrome on macOS',
    ip: '102.89.34.17',
    secureAccountUrl: 'http://localhost:5173/activate?type=customer',
  }),
  'password-set': passwordSetEmail({
    name: 'Ada Okafor',
    email: 'ada@example.com',
    when: 'Thursday, 29 October 2026 at 09:41 GMT+1',
    resetUrl: 'http://localhost:5173/activate',
  }),
  activation: activationEmail({
    name: 'Ada Okafor',
    email: 'ada@example.com',
    link: 'http://localhost:5173/activate?token=sample-token-for-preview-only',
    expiresInMinutes: 60,
  }),
};

for (const [name, email] of Object.entries(previews)) {
  const file = path.join(outDir, `${name}.html`);
  fs.writeFileSync(file, email.html);
  console.log(`${email.subject.padEnd(40)} ${file}`);
  if (!process.argv.includes('--no-open')) {
    execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [file]);
  }
}
