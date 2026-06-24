export async function up(knex) {
  await knex.schema.createTable('recipes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('name').notNullable();
    table.text('source').notNullable().defaultTo('manual');
    table.text('meal_type').nullable();
    table.text('cuisine').nullable();
    table.text('difficulty').nullable();
    table.integer('cook_time_mins').nullable();
    table.integer('servings').nullable();
    table.boolean('is_public').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTable('recipes');
}
