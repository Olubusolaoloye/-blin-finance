import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function makeTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function POST(req: Request) {
  const { email } = (await req.json()) as { email?: string };

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ error: "Email not configured" }, { status: 503 });
  }

  const transport = makeTransport();
  const ts = new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" });

  await Promise.all([
    // Notify blinprotocol@gmail.com
    transport.sendMail({
      from: `"Blin Finance Waitlist" <${process.env.GMAIL_USER}>`,
      to:   "blinprotocol@gmail.com",
      subject: `🚀 New waitlist signup: ${email}`,
      text:    `New signup: ${email}\nTime (WAT): ${ts}`,
      html: `
        <div style="font-family:sans-serif;padding:24px;max-width:480px;">
          <b style="font-size:18px;">New waitlist signup</b>
          <p style="margin:12px 0;font-size:16px;">📧 <b>${email}</b></p>
          <p style="color:#666;font-size:13px;">Time (WAT): ${ts}</p>
        </div>
      `,
    }),

    // Confirm to the user
    transport.sendMail({
      from:    `"Blin Finance" <${process.env.GMAIL_USER}>`,
      to:      email,
      subject: "You're on the Blin Finance waitlist! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:32px;background:#0D2137;font-family:-apple-system,sans-serif;">
          <div style="max-width:480px;margin:0 auto;">
            <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:32px;">
              Blin<span style="color:#2E86AB;font-weight:400;">Finance</span>
            </div>
            <div style="background:#122D4A;border-radius:20px;padding:36px;border:1px solid rgba(255,255,255,0.08);">
              <div style="font-size:40px;margin-bottom:16px;">🎉</div>
              <h1 style="color:#fff;font-size:26px;font-weight:800;margin:0 0 12px;">You're on the list!</h1>
              <p style="color:rgba(255,255,255,0.65);font-size:15px;line-height:1.6;margin:0 0 28px;">
                We'll be in touch the moment Blin Finance opens in your region. Your spot is secured.
              </p>
              <div style="background:rgba(245,166,35,0.12);border:1px solid rgba(245,166,35,0.25);border-radius:12px;padding:20px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#F5A623;margin-bottom:6px;">What's coming</div>
                <ul style="color:rgba(255,255,255,0.7);font-size:14px;line-height:2;margin:0;padding-left:18px;">
                  <li>Swap any token across ETH &amp; BNB Chain</li>
                  <li>AutoSave a % of every swap · Earn 4.2% APY</li>
                  <li>NGN deposits via bank transfer, OPay &amp; MoMo</li>
                  <li>Fractional US &amp; African stocks</li>
                </ul>
              </div>
            </div>
            <p style="color:rgba(255,255,255,0.25);font-size:12px;margin-top:28px;text-align:center;">
              © 2026 Blin Finance · Not financial advice · DeFi involves risk<br>
              You received this because you signed up at blinfinance.com
            </p>
          </div>
        </body>
        </html>
      `,
    }),
  ]);

  return NextResponse.json({ success: true });
}

// Allow CORS for the standalone HTML landing page (if hosted separately)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
