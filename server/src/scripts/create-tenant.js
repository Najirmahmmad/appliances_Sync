import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTenant } from '../services/tenantService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--company') {
      options.companyName = args[index + 1];
      index += 1;
    } else if (arg === '--db') {
      options.dbName = args[index + 1];
      index += 1;
    } else if (arg === '--admin-id') {
      options.adminId = args[index + 1];
      index += 1;
    } else if (arg === '--admin-name') {
      options.adminName = args[index + 1];
      index += 1;
    } else if (arg === '--admin-email') {
      options.adminEmail = args[index + 1];
      index += 1;
    } else if (arg === '--admin-password') {
      options.adminPassword = args[index + 1];
      index += 1;
    }
  }

  return options;
};

const main = async () => {
  const {
    companyName,
    dbName,
    adminId,
    adminName,
    adminEmail,
    adminPassword
  } = parseArgs();

  if (!companyName || !dbName || !adminId || !adminPassword) {
    console.error('Usage: node src/scripts/create-tenant.js --company "ABC Company" --db company_abc --admin-id admin --admin-password secret [--admin-name "Admin User"] [--admin-email admin@abc.com]');
    process.exit(1);
  }

  try {
    const result = await createTenant({
      companyName,
      dbName,
      adminUser: {
        id: adminId,
        name: adminName || adminId,
        email: adminEmail,
        password: adminPassword,
        role: 'Admin'
      }
    });

    console.log('Tenant created successfully:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Tenant creation failed:', error.message);
    process.exit(1);
  }
};

main();
