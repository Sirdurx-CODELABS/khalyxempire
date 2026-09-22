export const TITLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  sales: 'Sales staff',
  cashier: 'Cashier'
};

export const ACCESS_LABELS = {
  admin: 'Admin dashboard',
  erp: 'ERP system',
  both: 'Both'
};

export const STATUS_LABELS = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  off: 'Off',
  unscheduled: 'Unscheduled',
  upcoming: 'Upcoming'
};

export function monthAgo() {
  return new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function weekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
