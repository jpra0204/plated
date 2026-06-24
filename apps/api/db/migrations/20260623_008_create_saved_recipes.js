export async function up(knex) {
  await knex.schema.createTable('saved_recipes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('recipe_id').notNullable().references('id').inTable('recipes').onDelete('CASCADE');
    table.boolean('is_chef_pick').notNullable().defaultTo(false);
    table.timestamp('saved_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.unique(['user_id', 'recipe_id']);
  });

  // Partial index — active saves ordered by recency
  await knex.raw(
    'CREATE INDEX idx_saved_recipes_user ON saved_recipes(user_id, saved_at DESC) WHERE deleted_at IS NULL'
  );
}

export async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_saved_recipes_user');
  await knex.schema.dropTable('saved_recipes');
}
