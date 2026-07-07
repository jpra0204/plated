/**
 * Migration: add shelf_life_days (INTEGER, nullable) column to ingredients.
 *
 * NULL means no expiry tracking for this ingredient (e.g. dried herbs/seasonings).
 * Populated via the ingredients seed after this migration runs.
 */

export async function up(knex) {
  await knex.schema.alterTable('ingredients', (table) => {
    table.integer('shelf_life_days').nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('ingredients', (table) => {
    table.dropColumn('shelf_life_days');
  });
}
