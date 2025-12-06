import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const connectionString = process.env.DATABASE_URL || 'postgres://laocinema:laocinema_dev@localhost:5432/lao_cinema';

async function main() {
  console.log('Running migrations...');
  
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);
  
  await migrate(db, { migrationsFolder: './migrations' });
  
  console.log('Migrations completed!');
  await migrationClient.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed!');
  console.error(err);
  process.exit(1);
});
