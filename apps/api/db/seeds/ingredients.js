/**
 * Seed the global ingredient catalogue (~80 common pantry items).
 *
 * Categories: produce | dairy | grains | protein | legumes | other
 * Units:      g | ml | pcs | tsp  (default_unit)
 *
 * Run: npm run seed -w apps/api
 * Idempotent: clears existing rows before re-inserting.
 */

const INGREDIENTS = [
  // ── Produce ─────────────────────────────────────────────────────────────────
  { name: 'Tomato',        category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'kg'],       is_countable: true  },
  { name: 'Onion',         category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'kg'],       is_countable: true  },
  { name: 'Garlic',        category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'cloves'],   is_countable: true  },
  { name: 'Potato',        category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'kg'],       is_countable: true  },
  { name: 'Sweet Potato',  category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'kg'],       is_countable: true  },
  { name: 'Carrot',        category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'kg'],       is_countable: true  },
  { name: 'Bell Pepper',   category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g'],             is_countable: true  },
  { name: 'Broccoli',      category: 'produce', default_unit: 'g',   allowed_units: ['g', 'kg', 'pcs'],       is_countable: false },
  { name: 'Cauliflower',   category: 'produce', default_unit: 'g',   allowed_units: ['g', 'kg', 'pcs'],       is_countable: false },
  { name: 'Spinach',       category: 'produce', default_unit: 'g',   allowed_units: ['g', 'kg', 'cups'],      is_countable: false },
  { name: 'Kale',          category: 'produce', default_unit: 'g',   allowed_units: ['g', 'cups'],            is_countable: false },
  { name: 'Lettuce',       category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'cups'],     is_countable: true  },
  { name: 'Cucumber',      category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g'],             is_countable: true  },
  { name: 'Zucchini',      category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g'],             is_countable: true  },
  { name: 'Mushroom',      category: 'produce', default_unit: 'g',   allowed_units: ['g', 'pcs', 'cups'],     is_countable: false },
  { name: 'Celery',        category: 'produce', default_unit: 'g',   allowed_units: ['g', 'stalks', 'cups'],  is_countable: false },
  { name: 'Lemon',         category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'ml'],            is_countable: true  },
  { name: 'Lime',          category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'ml'],            is_countable: true  },
  { name: 'Apple',         category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g'],             is_countable: true  },
  { name: 'Banana',        category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g'],             is_countable: true  },
  { name: 'Avocado',       category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g'],             is_countable: true  },
  { name: 'Cherry Tomato', category: 'produce', default_unit: 'g',   allowed_units: ['g', 'pcs', 'cups'],     is_countable: false },
  { name: 'Corn',          category: 'produce', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'cups'],     is_countable: true  },

  // ── Dairy ───────────────────────────────────────────────────────────────────
  { name: 'Egg',            category: 'dairy',   default_unit: 'pcs', allowed_units: ['pcs'],                   is_countable: true  },
  { name: 'Milk',           category: 'dairy',   default_unit: 'ml',  allowed_units: ['ml', 'l', 'cups'],       is_countable: false },
  { name: 'Butter',         category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'tbsp', 'oz'],       is_countable: false },
  { name: 'Cheddar Cheese', category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'oz', 'cups'],       is_countable: false },
  { name: 'Parmesan',       category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'oz', 'cups'],       is_countable: false },
  { name: 'Mozzarella',     category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'oz'],               is_countable: false },
  { name: 'Greek Yogurt',   category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'ml', 'cups'],       is_countable: false },
  { name: 'Heavy Cream',    category: 'dairy',   default_unit: 'ml',  allowed_units: ['ml', 'l', 'cups'],       is_countable: false },
  { name: 'Sour Cream',     category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'ml', 'cups'],       is_countable: false },
  { name: 'Cream Cheese',   category: 'dairy',   default_unit: 'g',   allowed_units: ['g', 'oz'],               is_countable: false },

  // ── Grains ──────────────────────────────────────────────────────────────────
  { name: 'White Rice',       category: 'grains', default_unit: 'g',   allowed_units: ['g', 'kg', 'cups'],   is_countable: false },
  { name: 'Brown Rice',       category: 'grains', default_unit: 'g',   allowed_units: ['g', 'kg', 'cups'],   is_countable: false },
  { name: 'Pasta',            category: 'grains', default_unit: 'g',   allowed_units: ['g', 'kg'],           is_countable: false },
  { name: 'All-Purpose Flour',category: 'grains', default_unit: 'g',   allowed_units: ['g', 'kg', 'cups'],   is_countable: false },
  { name: 'Bread',            category: 'grains', default_unit: 'pcs', allowed_units: ['pcs', 'g', 'slices'],is_countable: true  },
  { name: 'Breadcrumbs',      category: 'grains', default_unit: 'g',   allowed_units: ['g', 'cups', 'tbsp'], is_countable: false },
  { name: 'Rolled Oats',      category: 'grains', default_unit: 'g',   allowed_units: ['g', 'cups'],         is_countable: false },
  { name: 'Quinoa',           category: 'grains', default_unit: 'g',   allowed_units: ['g', 'cups'],         is_countable: false },
  { name: 'Couscous',         category: 'grains', default_unit: 'g',   allowed_units: ['g', 'cups'],         is_countable: false },
  { name: 'Cornstarch',       category: 'grains', default_unit: 'g',   allowed_units: ['g', 'tbsp', 'tsp'],  is_countable: false },
  { name: 'Tortilla',         category: 'grains', default_unit: 'pcs', allowed_units: ['pcs', 'g'],          is_countable: true  },
  { name: 'Panko',            category: 'grains', default_unit: 'g',   allowed_units: ['g', 'cups', 'tbsp'], is_countable: false },

  // ── Protein ─────────────────────────────────────────────────────────────────
  { name: 'Chicken Breast',  category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg', 'pcs'],    is_countable: false },
  { name: 'Chicken Thigh',   category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg', 'pcs'],    is_countable: false },
  { name: 'Ground Beef',     category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg'],           is_countable: false },
  { name: 'Beef Steak',      category: 'protein', default_unit: 'g',   allowed_units: ['g', 'pcs'],          is_countable: false },
  { name: 'Salmon',          category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg', 'pcs'],    is_countable: false },
  { name: 'Tuna',            category: 'protein', default_unit: 'g',   allowed_units: ['g', 'cans'],         is_countable: false },
  { name: 'Shrimp',          category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg', 'pcs'],    is_countable: false },
  { name: 'Bacon',           category: 'protein', default_unit: 'g',   allowed_units: ['g', 'strips', 'pcs'],is_countable: false },
  { name: 'Sausage',         category: 'protein', default_unit: 'g',   allowed_units: ['g', 'pcs'],          is_countable: false },
  { name: 'Ground Turkey',   category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg'],           is_countable: false },
  { name: 'Pork Chop',       category: 'protein', default_unit: 'g',   allowed_units: ['g', 'pcs'],          is_countable: false },
  { name: 'Tofu',            category: 'protein', default_unit: 'g',   allowed_units: ['g', 'pcs', 'blocks'],is_countable: false },
  { name: 'Tempeh',          category: 'protein', default_unit: 'g',   allowed_units: ['g', 'pcs'],          is_countable: false },
  { name: 'Lamb',            category: 'protein', default_unit: 'g',   allowed_units: ['g', 'kg'],           is_countable: false },
  { name: 'Sardines',        category: 'protein', default_unit: 'g',   allowed_units: ['g', 'cans'],         is_countable: false },

  // ── Legumes ─────────────────────────────────────────────────────────────────
  { name: 'Black Beans',   category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cans', 'cups'],  is_countable: false },
  { name: 'Chickpeas',     category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cans', 'cups'],  is_countable: false },
  { name: 'Lentils',       category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cups'],          is_countable: false },
  { name: 'Kidney Beans',  category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cans', 'cups'],  is_countable: false },
  { name: 'White Beans',   category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cans', 'cups'],  is_countable: false },
  { name: 'Pinto Beans',   category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cans', 'cups'],  is_countable: false },
  { name: 'Edamame',       category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cups'],          is_countable: false },
  { name: 'Split Peas',    category: 'legumes', default_unit: 'g',   allowed_units: ['g', 'cups'],          is_countable: false },

  // ── Other (oils, spices, condiments, stocks) ─────────────────────────────────
  { name: 'Olive Oil',          category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false },
  { name: 'Vegetable Oil',      category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false },
  { name: 'Sesame Oil',         category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false },
  { name: 'Coconut Oil',        category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false },
  { name: 'Salt',               category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Black Pepper',       category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Cumin',              category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Paprika',            category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Oregano',            category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Basil',              category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Thyme',              category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Cinnamon',           category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Chili Flakes',       category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Garlic Powder',      category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Onion Powder',       category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Turmeric',           category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Soy Sauce',          category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false },
  { name: 'Tomato Paste',       category: 'other', default_unit: 'g',   allowed_units: ['g', 'tbsp', 'tsp'],   is_countable: false },
  { name: 'Chicken Stock',      category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'l', 'cups'],    is_countable: false },
  { name: 'Vegetable Stock',    category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'l', 'cups'],    is_countable: false },
  { name: 'Coconut Milk',       category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'cans', 'cups'], is_countable: false },
  { name: 'Honey',              category: 'other', default_unit: 'g',   allowed_units: ['g', 'tbsp', 'tsp'],   is_countable: false },
  { name: 'Sugar',              category: 'other', default_unit: 'g',   allowed_units: ['g', 'cups', 'tbsp'],  is_countable: false },
  { name: 'Brown Sugar',        category: 'other', default_unit: 'g',   allowed_units: ['g', 'cups', 'tbsp'],  is_countable: false },
  { name: 'Baking Powder',      category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'tbsp', 'g'],   is_countable: false },
  { name: 'Baking Soda',        category: 'other', default_unit: 'tsp', allowed_units: ['tsp', 'g'],           is_countable: false },
  { name: 'Vanilla Extract',    category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tsp'],          is_countable: false },
  { name: 'Rice Vinegar',       category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false },
  { name: 'White Wine Vinegar', category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false },
  { name: 'Dijon Mustard',      category: 'other', default_unit: 'g',   allowed_units: ['g', 'tbsp', 'tsp'],   is_countable: false },
  { name: 'Mayonnaise',         category: 'other', default_unit: 'g',   allowed_units: ['g', 'tbsp', 'cups'],  is_countable: false },
  { name: 'Sriracha',           category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false },
  { name: 'Worcestershire Sauce', category: 'other', default_unit: 'ml', allowed_units: ['ml', 'tbsp', 'tsp'], is_countable: false },
  { name: 'Fish Sauce',         category: 'other', default_unit: 'ml',  allowed_units: ['ml', 'tbsp', 'tsp'],  is_countable: false },
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
  }));

  await knex('ingredients').insert(rows);
}
