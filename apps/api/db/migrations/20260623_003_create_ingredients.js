export async function up(knex) {
  await knex.schema.createTable('ingredients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('name').notNullable();
    table.text('name_normalized').notNullable().unique();
    table.text('category').notNullable();
    table.text('default_unit').notNullable();
    table.specificType('allowed_units', 'TEXT[]').notNullable().defaultTo(knex.raw("'{}'::text[]"));
    table.boolean('is_countable').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTable('ingredients');
}
