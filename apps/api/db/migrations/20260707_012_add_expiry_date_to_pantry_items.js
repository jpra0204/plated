/**
 * Migration: add expiry_date (TIMESTAMPTZ, nullable) column to pantry_items.
 *
 * Auto-calculated on insert as added_at + shelf_life_days when the item resolves
 * to a catalogue ingredient with a non-null shelf_life_days.
 * User-editable via PATCH /api/v1/pantry/:id.
 * NULL for free-text items or catalogue ingredients with no shelf-life value.
 */

export async function up(knex) {
  await knex.schema.alterTable('pantry_items', (table) => {
    table.timestamp('expiry_date', { useTz: true }).nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('pantry_items', (table) => {
    table.dropColumn('expiry_date');
  });
}
