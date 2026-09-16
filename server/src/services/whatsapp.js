import { env } from '../config/env.js';
import { formatNaira } from '@khalyx/shared';

export function buildWhatsAppLink(order) {
  const number = env.whatsappNumber.replace(/[^\d]/g, '');
  const items = order.items
    .map((i) => `• ${i.qty}x ${i.name}${i.size ? ` / ${i.size}` : ''}${i.color ? ` / ${i.color}` : ''}`)
    .join('\n');
  const text = `Hello Khalyx Empire, I just placed order ${order.orderNumber} totaling ${formatNaira(order.total)}.

${items}

Name: ${order.shippingAddress?.fullName || order.guestName}
Phone: ${order.shippingAddress?.phone || order.guestPhone}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
