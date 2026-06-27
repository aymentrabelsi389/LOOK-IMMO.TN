"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResetCodeEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Create a transport using SMTP environment variables
const host = process.env.SMTP_HOST || '';
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';
const from = process.env.SMTP_FROM || 'Look Immo <no-reply@look-immo.tn>';
let transporter = null;
// Initialize transporter if env vars are present
if (host && user && pass) {
    transporter = nodemailer_1.default.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
            user,
            pass,
        },
    });
}
const sendResetCodeEmail = async (email, code) => {
    const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation de votre mot de passe - Look Immo</title>
        <style>
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #F8FAFC;
                color: #0F172A;
                margin: 0;
                padding: 0;
                -webkit-font-smoothing: antialiased;
            }
            .container {
                max-width: 600px;
                margin: 40px auto;
                background-color: #FFFFFF;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
                border: 1px solid #E2E8F0;
            }
            .header {
                background-color: #0F172A;
                padding: 32px;
                text-align: center;
            }
            .header h1 {
                color: #FFFFFF;
                font-size: 24px;
                margin: 0;
                font-weight: 700;
                letter-spacing: -0.025em;
            }
            .header span {
                color: #0EA5E9;
                font-style: italic;
            }
            .content {
                padding: 40px 32px;
                line-height: 1.6;
            }
            .content p {
                font-size: 16px;
                color: #334155;
                margin-top: 0;
                margin-bottom: 24px;
            }
            .code-box {
                background-color: #F1F5F9;
                border-radius: 12px;
                padding: 24px;
                text-align: center;
                margin: 32px 0;
                border: 1px dashed #CBD5E1;
            }
            .code {
                font-size: 36px;
                font-weight: 700;
                color: #0F172A;
                letter-spacing: 6px;
                font-family: 'Courier New', Courier, monospace;
            }
            .footer {
                background-color: #F8FAFC;
                padding: 24px 32px;
                text-align: center;
                border-top: 1px solid #F1F5F9;
                font-size: 13px;
                color: #64748B;
            }
            .footer p {
                margin: 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Look <span>Immo</span></h1>
            </div>
            <div class="content">
                <p>Bonjour,</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Look Immo.</p>
                <p>Votre code de vérification à 6 chiffres est :</p>
                
                <div class="code-box">
                    <span class="code">${code}</span>
                </div>
                
                <p>Ce code est valable pendant <strong>10 minutes</strong> et possède une limite de tentatives de saisie pour des raisons de sécurité.</p>
                <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité. Votre mot de passe restera inchangé.</p>
                <p>L'équipe Look Immo</p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Look Immo. Tous droits réservés.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    const text = `
Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe.

Votre code de vérification est :

${code}

Ce code est valable pendant 10 minutes.

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

L'équipe Look Immo
    `;
    if (!transporter) {
        console.warn('\n⚠️  [EMAIL SERVICE] Nodemailer is not configured (missing SMTP environment variables).');
        console.warn(`👉 [RESET CODE FOR ${email}]: ${code}`);
        console.warn('Please add SMTP config in .env to send real emails.\n');
        return;
    }
    try {
        await transporter.sendMail({
            from,
            to: email,
            subject: 'Réinitialisation de votre mot de passe - Look Immo',
            text,
            html,
        });
        console.log(`✅ [EMAIL SERVICE] Reset code email sent successfully to: ${email}`);
    }
    catch (error) {
        console.error(`❌ [EMAIL SERVICE] Failed to send email to ${email}:`, error);
        throw new Error("Impossible d'envoyer l'e-mail de réinitialisation.");
    }
};
exports.sendResetCodeEmail = sendResetCodeEmail;
//# sourceMappingURL=emailService.js.map