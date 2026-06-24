export async function up(knex) {
  await knex.schema.createTable('dietary_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.boolean('vegetarian').notNullable().defaultTo(false);
    table.boolean('gluten_free').notNullable().defaultTo(false);
    table.boolean('high_protein').notNullable().defaultTo(false);
    table.boolean('macro_tracking').notNullable().defaultTo(false);
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('dietary_preferences');
}
