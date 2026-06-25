/**
 * Centralized React Query key factory.
 *
 * Always use these instead of raw strings — consistent keys make invalidation
 * reliable across mutations in different components.
 *
 * All keys are arrays so React Query's partial-match invalidation works:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all() })
 *   …will invalidate both ['pantry', 'list'] and any other pantry sub-keys.
 */

export const queryKeys = {
  pantry: {
    all:  () => ['pantry'],
    list: () => ['pantry', 'list'],
  },

  recipes: {
    all:         () => ['recipes'],
    trending:    () => ['recipes', 'trending'],
    suggestions: () => ['recipes', 'suggestions'],
    detail:      (id) => ['recipes', 'detail', id],
  },

  saved: {
    all:  () => ['saved'],
    list: () => ['saved', 'list'],
  },

  profile: {
    root: () => ['profile'],
  },

  // Used by Pantry Manual tab autosuggest (GET /api/v1/ingredients or catalogue endpoint)
  ingredients: {
    catalogue: () => ['ingredients', 'catalogue'],
  },
};
