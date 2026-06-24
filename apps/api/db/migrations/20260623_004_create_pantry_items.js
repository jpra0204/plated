export async function up(knex) {
  await knex.schema.createTable('pantry_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('ingredient_id').nullable().references('id').inTable('ingredients');
    table.text('name').notNullable();
    table.text('category').notNullable();
    table.decimal('quantity', 10, 3).notNullable();
    table.text('unit').notNullable();
    table.timestamp('added_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });

  // Partial index — only active (non-deleted) items per user
  await knex.raw(
    'CREATE INDEX idx_pantry_items_user ON pantry_items(user_id) WHERE deleted_at IS NULL'
  );
}

export async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_pantry_items_user');
  await knex.schema.dropTable('pantry_items');
}
