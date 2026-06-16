/**
 * fakeData.js — static fixture data used by all static screens.
 * Replace with React Query hooks when the API is wired up.
 */

export const FAKE_USER = {
  displayName: 'Jamie Moreau',
  email: 'jamie@example.com',
  roleLabel: 'Home cook',
  city: 'Montréal',
  avatarUrl: null,
};

export const FAKE_STATS = {
  pantryCount: 14,
  savedCount: 8,
  cookedCount: 23,
};

// ── Ingredients catalogue (used by Pantry autosuggest) ────────────────────
export const INGREDIENT_CATALOGUE = [
  { id: '1',  name: 'Chicken breast',  category: 'Protein',  defaultUnit: 'g' },
  { id: '2',  name: 'Chickpeas',       category: 'Legumes',  defaultUnit: 'g' },
  { id: '3',  name: 'Chicken thighs',  category: 'Protein',  defaultUnit: 'g' },
  { id: '4',  name: 'Tomatoes',        category: 'Produce',  defaultUnit: 'pcs' },
  { id: '5',  name: 'Spinach',         category: 'Produce',  defaultUnit: 'g' },
  { id: '6',  name: 'Garlic',          category: 'Produce',  defaultUnit: 'cloves' },
  { id: '7',  name: 'Onion',           category: 'Produce',  defaultUnit: 'pcs' },
  { id: '8',  name: 'Eggs',            category: 'Dairy',    defaultUnit: 'pcs' },
  { id: '9',  name: 'Feta cheese',     category: 'Dairy',    defaultUnit: 'g' },
  { id: '10', name: 'Milk',            category: 'Dairy',    defaultUnit: 'ml' },
  { id: '11', name: 'Rice',            category: 'Grains',   defaultUnit: 'g' },
  { id: '12', name: 'Pasta',           category: 'Grains',   defaultUnit: 'g' },
  { id: '13', name: 'Olive oil',       category: 'Other',    defaultUnit: 'ml' },
  { id: '14', name: 'Cumin',           category: 'Other',    defaultUnit: 'tsp' },
  { id: '15', name: 'Avocado',         category: 'Produce',  defaultUnit: 'pcs' },
  { id: '16', name: 'Lemon',           category: 'Produce',  defaultUnit: 'pcs' },
  { id: '17', name: 'Bell pepper',     category: 'Produce',  defaultUnit: 'pcs' },
  { id: '18', name: 'Broccoli',        category: 'Produce',  defaultUnit: 'g' },
  { id: '19', name: 'Salmon fillet',   category: 'Protein',  defaultUnit: 'g' },
  { id: '20', name: 'Greek yogurt',    category: 'Dairy',    defaultUnit: 'g' },
];

// ── Pantry items (by category) ─────────────────────────────────────────────
export const FAKE_PANTRY = {
  Produce: [
    { id: 'p1', name: 'Tomatoes', quantity: 3,   unit: 'pcs' },
    { id: 'p2', name: 'Spinach',  quantity: 100, unit: 'g' },
    { id: 'p3', name: 'Garlic',   quantity: 6,   unit: 'cloves' },
    { id: 'p4', name: 'Onion',    quantity: 2,   unit: 'pcs' },
  ],
  Dairy: [
    { id: 'p5', name: 'Eggs', quantity: 6,   unit: 'pcs' },
    { id: 'p6', name: 'Feta', quantity: 200, unit: 'g' },
  ],
  Grains: [
    { id: 'p7', name: 'Pasta', quantity: 400, unit: 'g' },
    { id: 'p8', name: 'Rice',  quantity: 800, unit: 'g' },
  ],
  Protein: [
    { id: 'p9',  name: 'Chicken breast', quantity: 500, unit: 'g' },
    { id: 'p10', name: 'Salmon fillet',  quantity: 300, unit: 'g' },
  ],
  Other: [
    { id: 'p11', name: 'Olive oil', quantity: 500, unit: 'ml' },
    { id: 'p12', name: 'Cumin',     quantity: 30,  unit: 'g' },
    { id: 'p13', name: 'Lemon',     quantity: 3,   unit: 'pcs' },
    { id: 'p14', name: 'Avocado',   quantity: 2,   unit: 'pcs' },
  ],
};

// ── Recipes ────────────────────────────────────────────────────────────────
const SHAKSHUKA = {
  id: 'r1',
  name: 'Spiced Tomato & Feta Shakshuka',
  cookTime: 30,
  difficulty: 'Easy',
  servings: 2,
  cuisine: 'Mediterranean',
  mealType: 'Dinner',
  matchPct: 94,
  isChefPick: true,
  ingredients: [
    { name: 'Tomatoes',    quantity: 3,  unit: 'pcs',   inPantry: true },
    { name: 'Eggs',        quantity: 4,  unit: 'pcs',   inPantry: true },
    { name: 'Feta cheese', quantity: 80, unit: 'g',     inPantry: true },
    { name: 'Garlic',      quantity: 2,  unit: 'cloves',inPantry: true },
    { name: 'Cumin',       quantity: 1,  unit: 'tsp',   inPantry: false },
  ],
  steps: [
    'Heat olive oil in a pan over medium heat. Sauté garlic and onion until soft, about 4 minutes.',
    'Add crushed tomatoes and spices. Simmer for 10 minutes until thickened.',
    'Create wells in the sauce and crack eggs in. Cover and cook 5–7 min.',
    'Crumble feta on top and serve straight from the pan.',
  ],
};

const PASTA = {
  id: 'r2',
  name: 'Pasta Aglio e Olio',
  cookTime: 15,
  difficulty: 'Easy',
  servings: 2,
  cuisine: 'Italian',
  mealType: 'Lunch',
  matchPct: 87,
  isChefPick: true,
  ingredients: [
    { name: 'Pasta',      quantity: 200, unit: 'g',      inPantry: true },
    { name: 'Garlic',     quantity: 4,   unit: 'cloves', inPantry: true },
    { name: 'Olive oil',  quantity: 60,  unit: 'ml',     inPantry: true },
    { name: 'Parsley',    quantity: 1,   unit: 'bunch',  inPantry: false },
    { name: 'Chilli',     quantity: 1,   unit: 'pcs',    inPantry: false },
  ],
  steps: [
    'Boil salted water. Cook pasta until al dente.',
    'Gently fry sliced garlic in olive oil until golden.',
    'Drain pasta, toss in garlic oil with chilli flakes.',
    'Finish with chopped parsley and a squeeze of lemon.',
  ],
};

const STIR_FRY = {
  id: 'r3',
  name: 'Veggie Stir Fry',
  cookTime: 20,
  difficulty: 'Medium',
  servings: 2,
  cuisine: 'Asian',
  mealType: 'Dinner',
  matchPct: 80,
  isChefPick: false,
  ingredients: [
    { name: 'Bell pepper', quantity: 2,   unit: 'pcs', inPantry: true },
    { name: 'Broccoli',    quantity: 200, unit: 'g',   inPantry: true },
    { name: 'Rice',        quantity: 200, unit: 'g',   inPantry: true },
    { name: 'Soy sauce',   quantity: 3,   unit: 'tbsp',inPantry: false },
    { name: 'Ginger',      quantity: 1,   unit: 'tsp', inPantry: false },
  ],
  steps: [
    'Cook rice as per package instructions.',
    'Heat wok until smoking. Add oil.',
    'Stir fry vegetables on high heat for 3–4 min.',
    'Add soy sauce and ginger. Toss to combine.',
    'Serve over rice.',
  ],
};

const AVOCADO_TOAST = {
  id: 'r4',
  name: 'Avocado & Poached Egg Toast',
  cookTime: 10,
  difficulty: 'Easy',
  servings: 1,
  cuisine: 'Modern',
  mealType: 'Breakfast',
  matchPct: 60,
  isChefPick: false,
  ingredients: [
    { name: 'Avocado',      quantity: 1, unit: 'pcs',   inPantry: true },
    { name: 'Eggs',         quantity: 2, unit: 'pcs',   inPantry: true },
    { name: 'Sourdough',    quantity: 2, unit: 'slices',inPantry: false },
    { name: 'Chilli flakes',quantity: 1, unit: 'tsp',   inPantry: false },
    { name: 'Lemon',        quantity: 1, unit: 'pcs',   inPantry: true },
  ],
  steps: [
    'Toast sourdough until golden.',
    'Poach eggs in simmering water for 3 min.',
    'Smash avocado with lemon juice, salt and pepper.',
    'Spread avocado on toast, top with egg and chilli flakes.',
  ],
};

const LEMON_PASTA = {
  id: 'r5',
  name: 'Lemon Garlic Pasta',
  cookTime: 20,
  difficulty: 'Easy',
  servings: 2,
  cuisine: 'Italian',
  mealType: 'Lunch',
  matchPct: 40,
  isChefPick: true,
  ingredients: [
    { name: 'Pasta',         quantity: 200, unit: 'g',      inPantry: true },
    { name: 'Lemon',         quantity: 1,   unit: 'pcs',    inPantry: true },
    { name: 'Garlic',        quantity: 3,   unit: 'cloves', inPantry: true },
    { name: 'Parmesan',      quantity: 50,  unit: 'g',      inPantry: false },
    { name: 'Heavy cream',   quantity: 100, unit: 'ml',     inPantry: false },
    { name: 'Fresh basil',   quantity: 1,   unit: 'bunch',  inPantry: false },
  ],
  steps: [
    'Cook pasta al dente. Reserve 1 cup pasta water.',
    'Sauté garlic in butter until fragrant.',
    'Add cream and lemon juice. Simmer 2 min.',
    'Toss pasta in sauce, add parmesan. Adjust with pasta water.',
    'Top with fresh basil.',
  ],
};

export const FAKE_SUGGESTIONS = [SHAKSHUKA, PASTA, STIR_FRY];

export const FAKE_SAVED = [SHAKSHUKA, AVOCADO_TOAST, LEMON_PASTA];

// Chef screen result
export const FAKE_CHEF_RESULT = {
  ...SHAKSHUKA,
  name: 'Spiced Tomato & Feta Shakshuka',
  missingCount: 1,
};
