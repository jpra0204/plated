export async function up(knex) {
  await knex.schema.createTable('chef_generations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('recipe_id').nullable().references('id').inTable('recipes');
    table.jsonb('filters').notNullable();
    table.jsonb('pantry_snapshot').notNullable();
    table.text('status').notNullable().defaultTo('pending');
    table.uuid('retry_of').nullable().references('id').inTable('chef_generations');
    table.timestamp('approved_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTable('chef_generations');
}
