export async function up(knex) {
  await knex.schema.createTable('recipe_ingredients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('recipe_id').notNullable().references('id').inTable('recipes').onDelete('CASCADE');
    table.uuid('ingredient_id').nullable().references('id').inTable('ingredients');
    table.text('name').notNullable();
    table.decimal('quantity', 10, 3).nullable();
    table.text('unit').nullable();
    table.integer('sort_order').notNullable().defaultTo(0);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('recipe_ingredients');
}
