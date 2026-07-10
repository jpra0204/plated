export async function up(knex) {
  await knex.schema.table('recipes', (table) => {
    table.text('image_url').nullable();
  });
}

export async function down(knex) {
  await knex.schema.table('recipes', (table) => {
    table.dropColumn('image_url');
  });
}
