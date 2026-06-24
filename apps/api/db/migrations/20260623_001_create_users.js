export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('firebase_uid').notNullable().unique();
    table.text('email').notNullable().unique();
    table.text('display_name');
    table.text('city');
    table.text('role_label').notNullable().defaultTo('Home cook');
    table.text('avatar_url');
    table.integer('cooked_count').notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTable('users');
}
