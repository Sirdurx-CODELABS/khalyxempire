import { Supplier } from '../models/Supplier.js';
import { SupplyRequest } from '../models/SupplyRequest.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { HttpError } from '../middleware/error.js';

const POPULATE = [
  { path: 'submittedBy', select: 'name email role staffTitle' },
  { path: 'reviewedBy', select: 'name email' }
];

export function effectiveStatus(supplier) {
  return supplier?.status || 'approved';
}

export function parseTags(tags, category) {
  const list = Array.isArray(tags)
    ? tags
    : String(tags || '')
        .split(',')
        .map((t) => t.trim());
  const cleaned = list.map((t) => String(t || '').trim()).filter(Boolean);
  if (category && !cleaned.includes(category)) cleaned.unshift(category);
  return [...new Set(cleaned)];
}

export async function spendFor(supplierId) {
  const purchaseOrders = await PurchaseOrder.find({ supplier: supplierId }).sort({ createdAt: -1 });
  const countable = purchaseOrders.filter((po) => po.status !== 'cancelled');
  const spend = countable.reduce(
    (sum, po) => sum + po.items.reduce((s, i) => s + (i.unitCost || 0) * (i.qtyReceived || i.qtyOrdered || 0), 0),
    0
  );
  return { spend, orderCount: countable.length, purchaseOrders };
}

export function publicSupplier(supplier, extra = {}) {
  if (!supplier) return null;
  const doc = supplier.toObject ? supplier.toObject() : supplier;
  return {
    ...doc,
    status: effectiveStatus(doc),
    tags: doc.tags || [],
    submittedBy: supplier.submittedBy,
    reviewedBy: supplier.reviewedBy,
    ...extra
  };
}

export async function listSuppliers({ status, q } = {}) {
  const clauses = [];
  if (status === 'pending') clauses.push({ status: 'pending' });
  if (status === 'declined') clauses.push({ status: 'declined' });
  if (status === 'approved') {
    clauses.push({ $or: [{ status: 'approved' }, { status: { $exists: false } }, { status: null }] });
  }
  if (q) {
    clauses.push({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { contactName: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ]
    });
  }
  const filter = clauses.length ? { $and: clauses } : {};
  const suppliers = await Supplier.find(filter).populate(POPULATE).sort({ createdAt: -1 });
  const rows = [];
  for (const supplier of suppliers) {
    const { spend, orderCount } = await spendFor(supplier._id);
    rows.push(publicSupplier(supplier, { spend, orderCount }));
  }
  return rows;
}

export async function createSupplier(body, user, source) {
  if (!body.name) throw new HttpError(400, 'Supplier name is required');
  const supplier = await Supplier.create({
    name: body.name,
    contactName: body.contactName || '',
    email: body.email || '',
    phone: body.phone || '',
    whatsapp: body.whatsapp || '',
    category: body.category || 'other',
    tags: parseTags(body.tags, body.category || 'other'),
    address: body.address || '',
    paymentTerms: body.paymentTerms || 'Net 30',
    balance: Number(body.balance) || 0,
    notes: body.notes || '',
    status: 'pending',
    submittedFrom: source,
    submittedBy: user?._id
  });
  return publicSupplier(await supplier.populate(POPULATE));
}

export async function getSupplier(id) {
  const supplier = await Supplier.findById(id).populate(POPULATE);
  if (!supplier) throw new HttpError(404, 'Supplier not found');
  const { spend, orderCount, purchaseOrders } = await spendFor(supplier._id);
  const requests = await SupplyRequest.find({ supplier: supplier._id })
    .populate('requestedBy', 'name email role staffTitle')
    .populate('handledBy', 'name')
    .sort({ createdAt: -1 });
  return {
    supplier: publicSupplier(supplier, { spend, orderCount }),
    purchaseOrders,
    requests
  };
}

export async function updateSupplier(id, body, { allowStatus = false, reviewer } = {}) {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw new HttpError(404, 'Supplier not found');
  if (!supplier.status) supplier.status = 'approved';
  const fields = [
    'name',
    'contactName',
    'email',
    'phone',
    'whatsapp',
    'category',
    'address',
    'paymentTerms',
    'balance',
    'notes'
  ];
  for (const key of fields) {
    if (body[key] === undefined) continue;
    supplier[key] = key === 'balance' ? Number(body[key]) || 0 : body[key];
  }
  if (body.tags !== undefined || body.category) {
    supplier.tags = parseTags(body.tags !== undefined ? body.tags : supplier.tags, body.category || supplier.category);
  }
  if (allowStatus && body.status && body.status !== supplier.status) {
    if (!['approved', 'declined', 'pending'].includes(body.status)) throw new HttpError(400, 'Invalid supplier status');
    supplier.status = body.status;
    supplier.reviewedBy = reviewer?._id;
    supplier.reviewedAt = new Date();
    supplier.reviewNote = body.reviewNote || '';
  }
  await supplier.save();
  return publicSupplier(await supplier.populate(POPULATE));
}

export async function requireApprovedSupplier(id) {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw new HttpError(404, 'Supplier not found');
  if (effectiveStatus(supplier) !== 'approved') {
    throw new HttpError(409, 'Only approved suppliers can be used on purchase orders');
  }
  return supplier;
}

export async function createSupplyRequest(supplierId, user, message, source = 'erp') {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw new HttpError(404, 'Supplier not found');
  if (!String(message || '').trim()) throw new HttpError(400, 'Add a restock message');
  const request = await SupplyRequest.create({
    supplier: supplier._id,
    requestedBy: user._id,
    source,
    message: String(message).trim(),
    status: 'pending'
  });
  return request.populate([
    { path: 'supplier', select: 'name category status' },
    { path: 'requestedBy', select: 'name email role staffTitle' }
  ]);
}

export async function listSupplyRequests({ status, supplier } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (supplier) filter.supplier = supplier;
  return SupplyRequest.find(filter)
    .populate('supplier', 'name category status tags')
    .populate('requestedBy', 'name email role staffTitle')
    .populate('handledBy', 'name')
    .sort({ createdAt: -1 })
    .limit(200);
}

export async function updateSupplyRequest(id, { status }, user) {
  const request = await SupplyRequest.findById(id);
  if (!request) throw new HttpError(404, 'Request not found');
  if (status) {
    if (!['pending', 'in_progress', 'fulfilled'].includes(status)) throw new HttpError(400, 'Invalid request status');
    request.status = status;
    request.handledBy = user._id;
    request.handledAt = new Date();
    if (!request.seenAt) {
      request.seenAt = new Date();
      request.seenBy = user._id;
    }
  }
  await request.save();
  return request.populate([
    { path: 'supplier', select: 'name category status' },
    { path: 'requestedBy', select: 'name email' },
    { path: 'handledBy', select: 'name' }
  ]);
}

export async function markSupplyRequestsSeen(user, ids = []) {
  const filter = {
    status: { $in: ['pending', 'in_progress'] },
    $or: [{ seenAt: { $exists: false } }, { seenAt: null }]
  };
  if (ids.length) filter._id = { $in: ids };
  await SupplyRequest.updateMany(filter, { $set: { seenAt: new Date(), seenBy: user._id } });
  return supplierAlerts();
}

export function requestTone(request) {
  if (request.status === 'fulfilled') return 'ok';
  if (request.status === 'in_progress') return 'warn';
  if (!request.seenAt) return 'danger';
  return 'pending';
}

export async function supplierAlerts() {
  const unreadFilter = {
    status: 'pending',
    $or: [{ seenAt: { $exists: false } }, { seenAt: null }]
  };
  const [pendingSuppliers, pendingRequests, unreadRequests] = await Promise.all([
    Supplier.countDocuments({ status: 'pending' }),
    SupplyRequest.countDocuments({ status: 'pending' }),
    SupplyRequest.countDocuments(unreadFilter)
  ]);
  return { pendingSuppliers, pendingRequests, unreadRequests };
}
