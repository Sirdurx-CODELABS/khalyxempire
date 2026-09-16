import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { formatNaira } from '@khalyx/shared';

function transporter() {
  if (!env.smtpHost) return null;
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined
  });
}

export async function sendOrderEmail(order) {
  const to = order.guestEmail || order.user?.email;
  if (!to) return;
  const lines = order.items
    .map((i) => `${i.qty}x ${i.name} (${i.size || ''} ${i.color || ''}) — ${formatNaira(i.price * i.qty)}`)
    .join('\n');
  const text = `Thank you for your Khalyx Empire order ${order.orderNumber}.

${lines}

Subtotal: ${formatNaira(order.subtotal)}
Discount: ${formatNaira(order.discount)}
Shipping: ${formatNaira(order.shippingFee)}
Total: ${formatNaira(order.total)}

Status: ${order.status}
WhatsApp group: ${env.whatsappGroup}
WhatsApp us: ${order.whatsappLink}
`;

  const mail = {
    from: env.smtpFrom,
    to,
    subject: `Khalyx Empire — order ${order.orderNumber}`,
    text
  };

  const tx = transporter();
  if (!tx) {
    console.log('[email] SMTP not configured. Would send:\n', mail.subject, '\n', text);
    return;
  }
  await tx.sendMail(mail);
}
