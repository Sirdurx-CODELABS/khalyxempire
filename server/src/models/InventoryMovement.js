import mongoose from 'mongoose';
import { INVENTORY_MOVEMENT_TYPES, ORDER_CHANNELS } from '@khalyx/shared';

const inventoryMovementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: INVENTORY_MOVEMENT_TYPES, required: true },
    channel: { type: String, enum: [...ORDER_CHANNELS, 'system'], default: 'system' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: mongoose.Schema.Types.ObjectId,
    sku: String,
    qty: { type: Number, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    note: { type: String, default: '' }
  },
  { timestamps: true }
);

export const InventoryMovement = mongoose.model('InventoryMovement', inventoryMovementSchema);
