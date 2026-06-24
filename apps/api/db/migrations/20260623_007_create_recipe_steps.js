export async function up(knex) {
  await knex.schema.createTable('recipe_steps', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('recipe_id').notNullable().references('id').inTable('recipes').onDelete('CASCADE');
    table.integer('step_number').notNullable();
    table.text('instruction').notNullable();
  });
}

export async function down(knex) {
  await knex.schema.dropTable('recipe_steps');
}
