/**
 * Seed the global ingredient catalogue (~80 common pantry items).
 *
 * Categories: produce | dairy | grains | protein | legumes | other
 * Units:      g | ml | pcs | tsp  (default_unit)
 * shelf_life_days: integer (days) or null (no expiry tracking, e.g. dried herbs/seasonings)
 *
 * Run: npm run seed -w apps/api
 * Idempotent: clears existing rows before re-inserting.
 */

const INGREDIENTS = [
  // ── Produce ─────────────────────────────────────────────────────────────────
  { name: 'Tomato',        category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'kg'],       is_countable: true,  shelf_life_days: 5  },
  { name: 'Onion',         category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'kg'],       is_countable: true,  shelf_life_days: 60 },
  { name: 'Garlic',        category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'cloves'],   is_countable: true,  shelf_life_days: 30 },
  { name: 'Potato',        category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'kg'],       is_countable: true,  shelf_life_days: 30 },
  { name: 'Sweet Potato',  category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'kg'],       is_countable: true,  shelf_life_days: 21 },
  { name: 'Carrot',        category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'kg'],       is_countable: true,  shelf_life_days: 21 },
  { name: 'Bell Pepper',   category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g'],             is_countable: true,  shelf_life_days: 10 },
  { name: 'Broccoli',      category: 'produce', default_unit: 'g',   allowed_units: ['g', 'kg', 'pcs'],       is_countable: false, shelf_life_days: 5  },
  { name: 'Cauliflower',   category: 'produce', default_unit: 'g',   allowed_units: ['g', 'kg', 'pcs'],       is_countable: false, shelf_life_days: 5  },
  { name: 'Spinach',       category: 'produce', default_unit: 'g',   allowed_units: ['g', 'kg', 'cups'],      is_countable: false, shelf_life_days: 5  },
  { name: 'Kale',          category: 'produce', default_unit: 'g',   allowed_units: ['g', 'cups'],            is_countable: false, shelf_life_days: 7  },
  { name: 'Lettuce',       category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'cups'],     is_countable: true,  shelf_life_days: 7  },
  { name: 'Cucumber',      category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g'],             is_countable: true,  shelf_life_days: 7  },
  { name: 'Zucchini',      category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g'],             is_countable: true,  shelf_life_days: 7  },
  { name: 'Mushroom',      category: 'produce', default_unit: 'g',   allowed_units: ['g', 'pcs', 'cups'],     is_countable: false, shelf_life_days: 5  },
  { name: 'Celery',        category: 'produce', default_unit: 'g',   allowed_units: ['g', 'stalks', 'cups'],  is_countable: false, shelf_life_days: 14 },
  { name: 'Lemon',         category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'ml'],            is_countable: true,  shelf_life_days: 21 },
  { name: 'Lime',          category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'ml'],            is_countable: true,  shelf_life_days: 21 },
  { name: 'Apple',         category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g'],             is_countable: true,  shelf_life_days: 30 },
  { name: 'Banana',        category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g'],             is_countable: true,  shelf_life_days: 5  },
  { name: 'Avocado',       category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g'],             is_countable: true,  shelf_life_days: 4  },
  { name: 'Cherry Tomato', category: 'produce', default_unit: 'g',   allowed_units: ['g', 'pcs', 'cups'],     is_countable: false, shelf_life_days: 5  },
  { name: 'Corn',          category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'cups'],     is_countable: true,  shelf_life_days: 3  },

  // ── Dairy ───────────────────────────────────────────────────────────────────
  { name: 'Egg',            category: 'dairy',   default_unit: 'pcs', allowed_units: ['pcs'],                   is_countable: true,  shelf_life_days: 21 },
  { name: 'Milk',           category: 'dairy',   default_unit: 'ml',  allowed_units: ['ml', 'l', 'cups'],       is_countable: false, shelf_life_days: 7  },
  { name: 'Butter',         category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'tbsp', 'oz'],       is_countable: false, shelf_life_days: 30 },
  { name: 'Cheddar Cheese', category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'oz', 'cups'],       is_countable: false, shelf_life_days: 21 },
  { name: 'Parmesan',       category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'oz', 'cups'],       is_countable: false, shelf_life_days: 30 },
  { name: 'Mozzarella',     category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'oz'],               is_countable: false, shelf_life_days: 7  },
  { name: 'Greek Yogurt',   category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'ml', 'cups'],       is_countable: false, shelf_life_days: 14 },
  { name: 'Heavy Cream',    category: 'dairy',   default_unit: 'ml',  allowed_units: ['ml', 'l', 'cups'],       is_countable: false, shelf_life_days: 7  },
  { name: 'Sour Cream',     category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'ml', 'cups'],       is_countable: false, shelf_life_days: 14 },
  { name: 'Cream Cheese',   category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'oz'],               is_countable: false, shelf_life_days: 10 },

  // ── Grains ──────────────────────────────────────────────────────────────────
  { name: 'White Rice',       category: 'grains', default_unit: 'g',   allowed_units: ['g', 'kg', 'cups'],   is_countable: false, shelf_life_days: 365  },
  { name: 'Brown Rice',       category: 'grains', default_unit: 'g',   allowed_units: ['g', 'kg', 'cups'],   is_countable: false, shelf_life_days: 180  },
  { name: 'Pasta',            category: 'grains', default_unit: 'g',   allowed_units: ['g', 'kg'],           is_countable: false, shelf_life_days: 365  },
  { name: 'All-Purpose Flour',category: 'grains', default_unit: 'g',   allowed_units: ['g', 'kg', 'cups'],   is_countable: false, shelf_life_days: 365  },
  { name: 'Bread',            category: 'grains', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'slices'],is_countable: true,  shelf_life_days: 5    },
  { name: 'Breadcrumbs',      category: 'grains', default_unit: 'g',   allowed_units: ['g', 'cups', 'tbsp'], is_countable: false, shelf_life_days: 180  },
  { name: 'Rolled Oats',      category: 'grains', default_unit: 'g',   allowed_units: ['g', 'cups'],         is_countable: false, shelf_life_days: 365  },
  { name: 'Quinoa',           category: 'grains', default_unit: 'g',   allowed_units: ['g', 'cups'],         is_countable: false, shelf_life_days: 365  },
  { name: 'Couscous',         category: 'grains', default_unit: 'g',   allowed_units: ['g', 'cups'],         is_countable: false, shelf_life_days: 365  },
  { name: 'Cornstarch',       category: 'grains', default_unit: 'g',   allowed_units: ['g', 'tbsp', 'tsp'],  is_countable: false, shelf_life_days: 730  },
  { name: 'Tortilla',         category: 'grains', default_unit: 'pcs', allowed_units: ['pcs', 'g'],          is_countable: true,  shelf_life_days: 7    },
  { name: 'Panko',            category: 'grains', default_unit: 'g',   allowed_units: ['g', 'cups', 'tbsp'], is_countable: false, shelf_life_days: 180  },

  // ── Protein ─────────────────────────────────────────────────────────────────
  { name: 'Chicken Breast',  category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg', 'pcs'],    is_countable: false, shelf_life_days: 2 },
  { name: 'Chicken Thigh',   category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg', 'pcs'],    is_countable: false, shelf_life_days: 2 },
  { name: 'Ground Beef',     category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg'],           is_countable: false, shelf_life_days: 2 },
  { name: 'Beef Steak',      category: 'protein', default_unit: 'g',   allowed_units: ['g', 'pcs'],          is_countable: false, shelf_life_days: 3 },
  { name: 'Salmon',          category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg', 'pcs'],    is_countable: false, shelf_life_days: 2 },
  { name: 'Tuna',            category: 'protein', default_unit: 'g',   allowed_units: ['g', 'cans'],         is_countable: false, shelf_life_days: 2 },
  { name: 'Shrimp',          category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg', 'pcs'],    is_countable: false, shelf_life_days: 2 },
  { name: 'Bacon',           category: 'protein', default_unit: 'g',   allowed_units: ['g', 'strips', 'pcs'],is_countable: false, shelf_life_days: 7 },
  { name: 'Sausage',         category: 'protein', default_unit: 'g',   allowed_units: ['g', 'pcs'],          is_countable: false, shelf_life_days: 3 },
  { name: 'Ground Turkey',   category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg'],           is_countable: false, shelf_life_days: 2 },
  { name: 'Pork Chop',       category: 'protein', default_unit: 'g',   allowed_units: ['g', 'pcs'],          is_countable: false, shelf_life_days: 3 },
  { name: 'Tofu',            category: 'protein', default_unit: 'g',   allowed_units: ['g', 'pcs', 'blocks'],is_countable: false, shelf_life_days: 5 },
  { name: 'Tempeh',          category: 'protein', default_unit: 'g',   allowed_units: ['g', 'pcs'],          is_countable: false, shelf_life_days: 7 },
  { name: 'Lamb',            category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg'],           is_countable: false, shelf_life_days: 3 },
  { name: 'Sardines',        category: 'protein', default_unit: 'g',   allowed_units: ['g', 'cans'],         is_countable: false, shelf_life_days: 2 },

  // ── Legumes ─────────────────────────────────────────────────────────────────
  { name: 'Black Beans',   category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cans', 'cups'],  is_countable: false, shelf_life_days: 360 },
  { name: 'Chickpeas',     category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cans', 'cups'],  is_countable: false, shelf_life_days: 360 },
  { name: 'Lentils',       category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cups'],          is_countable: false, shelf_life_days: 360 },
  { name: 'Kidney Beans',  category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cans', 'cups'],  is_countable: false, shelf_life_days: 360 },
  { name: 'White Beans',   category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cans', 'cups'],  is_countable: false, shelf_life_days: 360 },
  { name: 'Pinto Beans',   category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cans', 'cups'],  is_countable: false, shelf_life_days: 360 },
  { name: 'Edamame',       category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cups'],          is_countable: false, shelf_life_days: 3   },
  { name: 'Split Peas',    category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cups'],          is_countable: false, shelf_life_days: 360 },

  // ── Other (oils, condiments, stocks) ────────────────────────────────────────
  { name: 'Olive Oil',          category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false, shelf_life_days: 180  },
  { name: 'Vegetable Oil',      category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false, shelf_life_days: 365  },
  { name: 'Sesame Oil',         category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false, shelf_life_days: 180  },
  { name: 'Coconut Oil',        category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false, shelf_life_days: 730  },

  // ── Other (herbs & seasonings — NULL, no expiry tracking) ───────────────────
  { name: 'Salt',               category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: null },
  { name: 'Black Pepper',       category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: null },
  { name: 'Cumin',              category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: null },
  { name: 'Paprika',            category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: null },
  { name: 'Oregano',            category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: null },
  { name: 'Basil',              category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: null },
  { name: 'Thyme',              category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: null },
  { name: 'Cinnamon',           category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: null },
  { name: 'Chili Flakes',       category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: null },
  { name: 'Garlic Powder',      category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: null },
  { name: 'Onion Powder',       category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: null },
  { name: 'Turmeric',           category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: null },

  // ── Other (continued — condiments, stocks, baking) ──────────────────────────
  { name: 'Soy Sauce',          category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false, shelf_life_days: 180  },
  { name: 'Tomato Paste',       category: 'other', default_unit: 'g',   allowed_units: ['g', 'tbsp', 'tsp'],   is_countable: false, shelf_life_days: 7    },
  { name: 'Chicken Stock',      category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'l', 'cups'],    is_countable: false, shelf_life_days: 5    },
  { name: 'Vegetable Stock',    category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'l', 'cups'],    is_countable: false, shelf_life_days: 5    },
  { name: 'Coconut Milk',       category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'cans', 'cups'], is_countable: false, shelf_life_days: 5    },
  { name: 'Honey',              category: 'other', default_unit: 'g',   allowed_units: ['g', 'tbsp', 'tsp'],   is_countable: false, shelf_life_days: 1825 },
  { name: 'Sugar',              category: 'other', default_unit: 'g',   allowed_units: ['g', 'cups', 'tbsp'],  is_countable: false, shelf_life_days: 1825 },
  { name: 'Brown Sugar',        category: 'other', default_unit: 'g',   allowed_units: ['g', 'cups', 'tbsp'],  is_countable: false, shelf_life_days: 1825 },
  { name: 'Baking Powder',      category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false, shelf_life_days: 365  },
  { name: 'Baking Soda',        category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'g'],           is_countable: false, shelf_life_days: 180  },
  { name: 'Vanilla Extract',    category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tsp'],          is_countable: false, shelf_life_days: 730  },
  { name: 'Rice Vinegar',       category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false, shelf_life_days: 730  },
  { name: 'White Wine Vinegar', category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false, shelf_life_days: 1095 },
  { name: 'Dijon Mustard',      category: 'other', default_unit: 'g',   allowed_units: ['g', 'tbsp', 'tsp'],   is_countable: false, shelf_life_days: 365  },
  { name: 'Mayonnaise',         category: 'other', default_unit: 'g',   allowed_units: ['g', 'tbsp', 'cups'],  is_countable: false, shelf_life_days: 60   },
  { name: 'Sriracha',           category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false, shelf_life_days: 180  },
  { name: 'Worcestershire Sauce', category: 'other', default_unit: 'ml', allowed_units: ['ml', 'tbsp', 'tsp'], is_countable: false, shelf_life_days: 365  },
  { name: 'Fish Sauce',         category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false, shelf_life_days: 730  },
];

export async function seed(knex) {
  await knex('ingredients').del();

  const rows = INGREDIENTS.map((item) => ({
    name: item.name,
    name_normalized: item.name.toLowerCase().trim(),
    category: item.category,
    default_unit: item.default_unit,
    allowed_units: item.allowed_units,
    is_countable: item.is_countable,
    shelf_life_days: item.shelf_life_days ?? null,
  }));

  await knex('ingredients').insert(rows);
}
