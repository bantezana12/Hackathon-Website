import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Run after building. Creates deployment configuration for YOUR Cloudflare account.
// This script only writes a local config file; it does not deploy or change a database.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [databaseId, databaseName='fastforge-fan-favorite', workerName='fastforge-fan-favorite'] = process.argv.slice(2);
if (!databaseId || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(databaseId)) {
  console.error('Usage: node scripts/configure-production.mjs DATABASE_ID [DATABASE_NAME] [WORKER_NAME]');
  process.exit(1);
}
const built = path.join(root, 'dist/server/wrangler.json');
if (!fs.existsSync(built)) throw new Error('Build first: pnpm run build');
const config = JSON.parse(fs.readFileSync(built, 'utf8'));
config.name = workerName;
delete config.topLevelName;
config.d1_databases = [{binding:'DB', database_name:databaseName, database_id:databaseId, migrations_dir:'../../drizzle'}];
const output = path.join(root, 'dist/server/wrangler.production.json');
fs.writeFileSync(output, JSON.stringify(config, null, 2)+'\n');
console.log('Ready: dist/server/wrangler.production.json');
