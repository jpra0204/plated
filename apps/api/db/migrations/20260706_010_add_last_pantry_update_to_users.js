/**
 * Migration: add last_pantry_update JSONB column to users.
 *
 * Shape: { type: 'cook'|'add'|'edit'|'delete', recipe_name?: string, updated_at: timestamptz }
 *
 * Updated by the cook, pantry-add, pantry-edit, and pantry-delete endpoints
 * so the Pantry screen can show "Last updated: {label} · {time ago}".
 */

export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.jsonb('last_pantry_update').nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('last_pantry_update');
  });
}
