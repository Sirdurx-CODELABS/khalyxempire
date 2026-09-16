/**
 * Khalyx Empire catalog seed.
 *
 * Edit names, prices, sizes, colours, and stock here, then run:
 *   npm run seed
 *
 * Re-running seed replaces products and categories in the database.
 * Photos are left empty on purpose — add them in Admin → Products.
 */

const MEN_SHOE = ['40', '41', '42', '43', '44', '45'];
const WOMEN_SHOE = ['37', '38', '39', '40', '41'];
const APPAREL = ['S', 'M', 'L', 'XL', 'XXL'];
const BELT = ['85', '90', '95', '100'];

function variants(sizes, { color = 'Black', price, stock = 10, colors } = {}) {
  const palette = colors?.length ? colors : [color];
  return sizes.flatMap((size) => palette.map((shade) => ({ size, color: shade, price, stock })));
}

function item({ name, category, subcategory, price, sizes, colors = ['Black'], stock = 10, featured = false, newArrival = false, description, tags }) {
  return {
    name,
    category,
    subcategory,
    description: description || `${name} — Khalyx Empire ${subcategory}.`,
    images: [],
    tags: tags || [subcategory.toLowerCase()],
    featured,
    newArrival,
    variants: variants(sizes, { colors, price, stock })
  };
}

export const PRODUCTS = [
  item({
    name: "Men's Sneaker",
    category: 'footwear',
    subcategory: "Men's Sneakers",
    price: 65000,
    sizes: MEN_SHOE,
    colors: ['Black', 'White'],
    featured: true,
    tags: ['sneakers', 'men']
  }),
  item({
    name: "Men's Slide",
    category: 'footwear',
    subcategory: "Men's Slides",
    price: 22000,
    sizes: MEN_SHOE,
    colors: ['Black', 'Cream'],
    tags: ['slides', 'slippers', 'men']
  }),
  item({
    name: "Men's Loafer",
    category: 'footwear',
    subcategory: "Men's Loafers",
    price: 58000,
    sizes: MEN_SHOE,
    tags: ['loafers', 'men']
  }),
  item({
    name: "Women's Heel",
    category: 'footwear',
    subcategory: "Women's Heels",
    price: 48000,
    sizes: WOMEN_SHOE,
    colors: ['Black', 'Nude'],
    newArrival: true,
    tags: ['heels', 'women']
  }),
  item({
    name: "Women's Flat",
    category: 'footwear',
    subcategory: "Women's Flats",
    price: 32000,
    sizes: WOMEN_SHOE,
    colors: ['Black', 'Cream'],
    tags: ['flats', 'women']
  }),
  item({
    name: "Women's Sandal",
    category: 'footwear',
    subcategory: "Women's Sandals",
    price: 28000,
    sizes: WOMEN_SHOE,
    colors: ['Black', 'Gold'],
    tags: ['sandals', 'women']
  }),

  item({
    name: 'Snapback Cap',
    category: 'headwear',
    subcategory: 'Snapback Caps',
    price: 15000,
    sizes: ['OS'],
    colors: ['Black', 'Cream'],
    featured: true,
    tags: ['snapback', 'cap']
  }),
  item({
    name: 'Fitted Cap',
    category: 'headwear',
    subcategory: 'Fitted Caps',
    price: 18000,
    sizes: ['S/M', 'L/XL'],
    tags: ['fitted', 'cap']
  }),
  item({
    name: 'Beanie',
    category: 'headwear',
    subcategory: 'Beanies',
    price: 12000,
    sizes: ['OS'],
    colors: ['Black', 'Cream'],
    newArrival: true,
    tags: ['beanie']
  }),

  item({
    name: "Men's Jallabiya",
    category: 'traditional-wear',
    subcategory: "Men's Jallabiyas",
    price: 45000,
    sizes: APPAREL,
    colors: ['White', 'Black'],
    tags: ['jallabiya', 'men']
  }),
  item({
    name: "Men's Kaftan",
    category: 'traditional-wear',
    subcategory: "Men's Kaftans",
    price: 55000,
    sizes: APPAREL,
    colors: ['Black', 'Cream'],
    featured: true,
    tags: ['kaftan', 'men']
  }),
  item({
    name: 'Native Cap',
    category: 'traditional-wear',
    subcategory: 'Native Caps',
    price: 12000,
    sizes: ['OS'],
    colors: ['Black', 'Gold'],
    tags: ['fila', 'native cap']
  }),
  item({
    name: 'Abaya',
    category: 'traditional-wear',
    subcategory: 'Abayas',
    price: 42000,
    sizes: APPAREL,
    colors: ['Black'],
    newArrival: true,
    tags: ['abaya', 'women']
  }),
  item({
    name: 'Hijab',
    category: 'traditional-wear',
    subcategory: 'Hijabs',
    price: 8000,
    sizes: ['OS'],
    colors: ['Black', 'Cream', 'Gold'],
    tags: ['hijab', 'women']
  }),
  item({
    name: 'Ankara Set',
    category: 'traditional-wear',
    subcategory: 'Ankara',
    price: 38000,
    sizes: APPAREL,
    colors: ['Print'],
    tags: ['ankara', 'traditional']
  }),

  item({
    name: 'Graphic T-shirt',
    category: 'streetwear',
    subcategory: 'Graphic T-shirts',
    price: 18000,
    sizes: APPAREL,
    colors: ['Black', 'White'],
    featured: true,
    tags: ['tee', 'unisex']
  }),
  item({
    name: 'Hoodie',
    category: 'streetwear',
    subcategory: 'Hoodies',
    price: 35000,
    sizes: APPAREL,
    colors: ['Black', 'Cream'],
    newArrival: true,
    tags: ['hoodie', 'unisex']
  }),
  item({
    name: 'Joggers',
    category: 'streetwear',
    subcategory: 'Joggers',
    price: 28000,
    sizes: APPAREL,
    colors: ['Black'],
    tags: ['joggers', 'unisex']
  }),

  item({
    name: 'Handbag',
    category: 'bags',
    subcategory: 'Handbags',
    price: 45000,
    sizes: ['OS'],
    colors: ['Black'],
    featured: true,
    tags: ['handbag']
  }),
  item({
    name: 'Tote',
    category: 'bags',
    subcategory: 'Totes',
    price: 32000,
    sizes: ['OS'],
    colors: ['Black', 'Cream'],
    newArrival: true,
    tags: ['tote']
  }),
  item({
    name: 'Backpack',
    category: 'bags',
    subcategory: 'Backpacks',
    price: 38000,
    sizes: ['OS'],
    tags: ['backpack']
  }),
  item({
    name: 'Clutch',
    category: 'bags',
    subcategory: 'Clutches',
    price: 22000,
    sizes: ['OS'],
    colors: ['Black', 'Gold'],
    tags: ['clutch']
  }),

  item({
    name: 'Necklace',
    category: 'jewelry',
    subcategory: 'Necklaces',
    price: 25000,
    sizes: ['OS'],
    colors: ['Gold'],
    featured: true,
    tags: ['necklace']
  }),
  item({
    name: 'Bracelet',
    category: 'jewelry',
    subcategory: 'Bracelets',
    price: 18000,
    sizes: ['OS'],
    colors: ['Gold'],
    tags: ['bracelet']
  }),
  item({
    name: 'Earrings',
    category: 'jewelry',
    subcategory: 'Earrings',
    price: 15000,
    sizes: ['OS'],
    colors: ['Gold'],
    newArrival: true,
    tags: ['earrings']
  }),
  item({
    name: 'Ring',
    category: 'jewelry',
    subcategory: 'Rings',
    price: 12000,
    sizes: ['6', '7', '8', '9'],
    colors: ['Gold'],
    tags: ['ring']
  }),

  item({
    name: "Men's Perfume",
    category: 'fragrances',
    subcategory: "Men's Perfumes",
    price: 28000,
    sizes: ['50ml'],
    colors: ['Noir'],
    featured: true,
    tags: ['perfume', 'men']
  }),
  item({
    name: "Women's Perfume",
    category: 'fragrances',
    subcategory: "Women's Perfumes",
    price: 28000,
    sizes: ['50ml'],
    colors: ['Gold'],
    tags: ['perfume', 'women']
  }),

  item({
    name: 'Wristband',
    category: 'accessories',
    subcategory: 'Wristbands',
    price: 8000,
    sizes: ['OS'],
    colors: ['Black', 'Gold'],
    tags: ['wristband']
  }),
  item({
    name: 'Belt',
    category: 'accessories',
    subcategory: 'Belts',
    price: 18000,
    sizes: BELT,
    colors: ['Black'],
    tags: ['belt']
  }),
  item({
    name: 'Sunglasses',
    category: 'accessories',
    subcategory: 'Sunglasses',
    price: 22000,
    sizes: ['OS'],
    colors: ['Black'],
    featured: true,
    tags: ['sunglasses']
  })
];
