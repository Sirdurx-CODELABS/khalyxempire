import { Router } from 'express';
import { Subscriber } from '../models/Subscriber.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.post('/', async (req, res) => {
  const { email, phone } = req.body;
  if (!email && !phone) throw new HttpError(400, 'Email or WhatsApp number is required');
  const doc = await Subscriber.findOneAndUpdate(
    email ? { email: email.toLowerCase() } : { phone },
    { email: email?.toLowerCase(), phone: phone || '' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ subscriber: { id: doc._id, email: doc.email, phone: doc.phone } });
});

export default router;
