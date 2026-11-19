// HTML email templates.
//
// Email clients (Gmail, Outlook, Apple Mail) support only a small, old subset of HTML/CSS, so these use
// table layouts and inline styles throughout. The <style> block only adds mobile tweaks that clients
// which drop it can safely ignore. No external images, so nothing is blocked by default.

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const BRAND = '#1f5eff';
const TEXT = '#16191f';
const MUTED = '#646b78';
const PAGE_BG = '#eef1f7';
const CARD_BG = '#ffffff';
const PANEL_BG = '#f6f8fc';
const BORDER = '#e3e7ef';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// A table-based button, which renders as a real button even in Outlook.
function button(href: string, label: string, variant: 'primary' | 'danger' = 'primary'): string {
  const color = variant === 'primary' ? BRAND : '#d93025';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" bgcolor="${color}" style="border-radius:10px;background:${color}">
          <a href="${escapeHtml(href)}" target="_blank"
             style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;
                    color:#ffffff;text-decoration:none;border-radius:10px">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

function icon(emoji: string, background: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" valign="middle" width="56" height="56"
            style="width:56px;height:56px;border-radius:28px;background:${background};font-size:26px;line-height:56px">
          ${emoji}
        </td>
      </tr>
    </table>`;
}

function layout(options: { title: string; preheader: string; content: string; footer: string }): string {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(options.title)}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .detail-label { display: block !important; width: auto !important; padding-bottom: 2px !important; }
      .detail-value { display: block !important; padding-top: 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};-webkit-text-size-adjust:100%">
  <!-- Preview text shown next to the subject in the inbox list -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
    ${escapeHtml(options.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE_BG}">
    <tr>
      <td align="center" style="padding:32px 12px">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0"
               style="width:560px;max-width:560px">

          <!-- Brand header -->
          <tr>
            <td class="px" style="padding:0 8px 20px;font-family:${FONT};font-size:20px;font-weight:700;color:${TEXT}">
              <span style="color:${BRAND}">&#9670;</span> SwiftDrop
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${CARD_BG};border-radius:16px;border:1px solid ${BORDER};overflow:hidden">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height:6px;background:${BRAND};border-radius:16px 16px 0 0;font-size:0;line-height:0">&nbsp;</td></tr>
                <tr>
                  <td class="px" style="padding:36px 40px 40px;font-family:${FONT};color:${TEXT};font-size:15px;line-height:1.6">
                    ${options.content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="px" style="padding:24px 16px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};text-align:center">
              ${options.footer}
              <br><br>
              &copy; ${year} SwiftDrop Logistics
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailRow(label: string, value: string, isLast = false): string {
  const border = isLast ? '' : `border-bottom:1px solid ${BORDER};`;
  return `
    <tr>
      <td class="detail-label" width="110" valign="top"
          style="width:110px;padding:12px 0;${border}font-family:${FONT};font-size:13px;color:${MUTED}">
        ${escapeHtml(label)}
      </td>
      <td class="detail-value" valign="top"
          style="padding:12px 0;${border}font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT}">
        ${escapeHtml(value)}
      </td>
    </tr>`;
}

// ── Sign-in notification ─────────────────────────────────────────────────────

export interface SignInEmailData {
  name: string;
  email: string;
  when: string;
  device: string;
  ip: string;
  secureAccountUrl: string;
}

export function signInNotificationEmail(data: SignInEmailData): RenderedEmail {
  const firstName = data.name.split(' ')[0] || data.name;

  const content = `
    ${icon('&#128272;', '#e6edff')}
    <h1 style="margin:20px 0 8px;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:700;color:${TEXT}">
      New sign-in to your account
    </h1>
    <p style="margin:0 0 24px;color:${MUTED}">
      Hi ${escapeHtml(firstName)}, we noticed a new sign-in to your SwiftDrop account.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${PANEL_BG};border:1px solid ${BORDER};border-radius:12px">
      <tr>
        <td style="padding:4px 20px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${detailRow('When', data.when)}
            ${detailRow('Device', data.device)}
            ${detailRow('IP address', data.ip)}
            ${detailRow('Account', data.email, true)}
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
      <tr>
        <td style="padding:16px 20px;background:#ecf9f1;border-radius:12px;font-family:${FONT};font-size:14px;color:#14532d">
          <strong>Was this you?</strong> Great, there's nothing else you need to do.
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 16px;font-family:${FONT};font-size:15px;color:${TEXT}">
      <strong>Don't recognise this sign-in?</strong><br>
      Reset your password now to keep your deliveries and details safe.
    </p>
    ${button(data.secureAccountUrl, 'Secure my account', 'danger')}`;

  const footer = `You're receiving this because someone signed in to the SwiftDrop account for
    <span style="color:${TEXT}">${escapeHtml(data.email)}</span>.
    We send this for every sign-in to help keep your account safe.`;

  return {
    subject: 'New sign-in to your SwiftDrop account',
    html: layout({
      title: 'New sign-in to your SwiftDrop account',
      preheader: `Signed in on ${data.device}, ${data.when}. Not you? Secure your account.`,
      content,
      footer,
    }),
    text: [
      `Hi ${firstName},`,
      '',
      'We noticed a new sign-in to your SwiftDrop account.',
      '',
      `When:       ${data.when}`,
      `Device:     ${data.device}`,
      `IP address: ${data.ip}`,
      `Account:    ${data.email}`,
      '',
      "Was this you? Great, there's nothing else you need to do.",
      '',
      "Don't recognise this sign-in? Reset your password now:",
      data.secureAccountUrl,
      '',
      '— SwiftDrop Logistics',
    ].join('\n'),
  };
}

// ── Account activation (set password) ────────────────────────────────────────

export interface ActivationEmailData {
  name: string;
  email: string;
  link: string;
  expiresInMinutes: number;
}

export function activationEmail(data: ActivationEmailData): RenderedEmail {
  const firstName = data.name.split(' ')[0] || data.name;

  const content = `
    ${icon('&#128273;', '#e6edff')}
    <h1 style="margin:20px 0 8px;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:700;color:${TEXT}">
      Set up your password
    </h1>
    <p style="margin:0 0 28px;color:${MUTED}">
      Hi ${escapeHtml(firstName)}, your SwiftDrop account is ready. Choose a password to start booking and
      tracking deliveries.
    </p>
    ${button(data.link, 'Set my password')}
    <p style="margin:24px 0 0;font-family:${FONT};font-size:13px;color:${MUTED}">
      This link expires in <strong style="color:${TEXT}">${data.expiresInMinutes} minutes</strong> and can only be used once.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
      <tr>
        <td style="padding:16px 20px;background:${PANEL_BG};border:1px solid ${BORDER};border-radius:12px;
                   font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};word-break:break-all">
          Button not working? Paste this link into your browser:<br>
          <a href="${escapeHtml(data.link)}" style="color:${BRAND}">${escapeHtml(data.link)}</a>
        </td>
      </tr>
    </table>`;

  const footer = `You're receiving this because a password setup was requested for
    <span style="color:${TEXT}">${escapeHtml(data.email)}</span>.
    If that wasn't you, you can safely ignore this email.`;

  return {
    subject: 'Set up your SwiftDrop password',
    html: layout({
      title: 'Set up your SwiftDrop password',
      preheader: `Choose a password for your SwiftDrop account. Link expires in ${data.expiresInMinutes} minutes.`,
      content,
      footer,
    }),
    text: [
      `Hi ${firstName},`,
      '',
      'Your SwiftDrop account is ready. Use the link below to choose a password.',
      `It expires in ${data.expiresInMinutes} minutes and can only be used once.`,
      '',
      data.link,
      '',
      "If you didn't ask for this, you can ignore this email.",
      '',
      '— SwiftDrop Logistics',
    ].join('\n'),
  };
}
