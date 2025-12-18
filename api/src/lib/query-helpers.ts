/**
 * Query Helper Functions
 * 
 * Utility functions for common database query patterns.
 */

import { sql, SQL } from 'drizzle-orm';

/**
 * Build a SQL IN clause for filtering by multiple values
 * 
 * This helper standardizes the pattern of building IN clauses with Drizzle ORM,
 * which requires mapping values to SQL fragments and joining them.
 * 
 * @param column - The column to filter on
 * @param values - Array of values to match
 * @returns SQL IN clause
 * 
 * @example
 * const peopleIds = [1, 2, 3];
 * const whereClause = buildInClause(schema.people.id, peopleIds);
 * const people = await db.select().from(schema.people).where(whereClause);
 */
export function buildInClause<T>(column: any, values: T[]): SQL {
  if (values.length === 0) {
    // Return a condition that will never match if empty array
    return sql`1 = 0`;
  }
  
  return sql`${column} IN (${sql.join(values.map(v => sql`${v}`), sql`, `)})`;
}
