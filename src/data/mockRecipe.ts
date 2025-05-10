export const mockRecipe = {
    title: 'Creamy Carbonara',
    imageSrc: '/img/recipe/soup.png',
    imageAlt: 'A plate of creamy carbonara with bacon and parsley',
    shortDescription: 'An Italian classic with eggs, cheese, pancetta, and pepper – no cream required!',
    metadata: [
      { label: 'Servings', value: '2' },
      { label: 'Prep Time', value: '10 mins' },
      { label: 'Cook Time', value: '20 mins' },
      { label: 'Total Time', value: '30 mins' },
    ],
    ingredientGroups: [
      {
        groupTitle: 'For the Sauce',
        ingredients: [
          '2 large eggs',
          '1/2 cup grated Pecorino Romano',
          'Freshly ground black pepper',
        ],
      },
      {
        groupTitle: 'For the Pasta',
        ingredients: [
          '200g spaghetti',
          '100g pancetta or guanciale, diced',
          'Salt for boiling water',
        ],
      },
    ],
    steps: [
      'Bring a large pot of salted water to a boil. Cook spaghetti until al dente.',
      'While pasta cooks, sauté pancetta in a pan until crispy.',
      'In a bowl, whisk together eggs, cheese, and pepper.',
      'Reserve some pasta water. Drain pasta and combine with pancetta.',
      'Remove from heat. Stir in egg mixture, adding reserved water as needed.',
      'Toss until creamy. Serve immediately with extra cheese and pepper.',
    ],
    notes: 'Make sure the pan is off the heat before adding the egg mixture to avoid scrambling.',
    tags: ['Italian', 'Quick', 'Pasta', 'Comfort Food'],
    author: 'Chef Lucia Bianchi',
    isSaved: false,
  }
  