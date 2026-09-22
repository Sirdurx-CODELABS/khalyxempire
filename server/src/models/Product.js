import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  price: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  compareAtPrice: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  reserved: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  barcode: { type: String, default: '' }
});

const colorImageSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    images: [{ type: String }]
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    seoTitle: { type: String, default: '' },
    seoDescription: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subcategory: { type: String, default: '' },
    images: [{ type: String }],
    colorImages: { type: [colorImageSchema], default: [] },
    suppliers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', index: true }],
    basePrice: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    featured: { type: Boolean, default: false, index: true },
    newArrival: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['active', 'draft', 'out_of_stock'], default: 'active', index: true },
    isActive: { type: Boolean, default: true },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    variants: { type: [variantSchema], default: [] }
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ 'variants.barcode': 1 });

export const Product = mongoose.model('Product', productSchema);
