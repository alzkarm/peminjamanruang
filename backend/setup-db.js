const { Client } = require('pg');
const { execSync } = require('child_process');

const pgPassword = process.argv[2];
const pgPort = process.argv[3] || 5433;

if (!pgPassword) {
  console.log('Penggunaan: node setup-db.js <PASSWORD_POSTGRES> [PORT]');
  process.exit(1);
}

async function run() {
  console.log(`Connecting to PostgreSQL on port ${pgPort} as postgres...`);
  const client = new Client({
    user: 'postgres',
    password: pgPassword,
    host: 'localhost',
    port: Number(pgPort),
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('✔ Connected to PostgreSQL server.');

    const userRes = await client.query("SELECT 1 FROM pg_roles WHERE rolname='siperu_user'");
    if (userRes.rowCount === 0) {
      await client.query("CREATE USER siperu_user WITH PASSWORD 'change-me'");
      console.log("✔ Created database role 'siperu_user'.");
    } else {
      await client.query("ALTER USER siperu_user WITH PASSWORD 'change-me'");
      console.log("✔ Updated password for role 'siperu_user'.");
    }
    await client.query("ALTER USER siperu_user WITH CREATEDB CREATEROLE SUPERUSER");

    const dbRes = await client.query("SELECT 1 FROM pg_database WHERE datname='siperu_yarsi'");
    if (dbRes.rowCount === 0) {
      await client.query("CREATE DATABASE siperu_yarsi OWNER siperu_user");
      console.log("✔ Created database 'siperu_yarsi'.");
    } else {
      console.log("✔ Database 'siperu_yarsi' already exists.");
    }

    await client.end();

    console.log('Applying Prisma DB Push...');
    execSync('npx prisma db push', { stdio: 'inherit' });

    console.log('Seeding database with demo data...');
    execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit' });

    console.log('🎉 Setup database PostgreSQL SIPERU YARSI 100% Selesai & Siap!');
  } catch (err) {
    console.error('❌ Gagal mengkonfigurasi database:', err.message);
    process.exit(1);
  }
}

run();
