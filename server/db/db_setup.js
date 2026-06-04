const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = require('./constants');

const TABLES = [
  'users',
  'commission_members',
  'meetings',
  'protocols',
  'commission_documents',
  'assignments',
  'reports',
  'audit_log',
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function readSqlFile(filename) {
  return fs.readFileSync(path.join(__dirname, filename), 'utf8');
}

async function getRootConnection() {
  return mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });
}

async function getDbConnection() {
  return mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });
}

async function databaseExists(connection) {
  const [rows] = await connection.query(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [DB_NAME]
  );
  return rows.length > 0;
}

async function checkStatus() {
  console.log('\n--- Перевірка стану бази даних ---\n');
  console.log(`Хост:     ${DB_HOST}:${DB_PORT}`);
  console.log(`Користувач: ${DB_USER}`);
  console.log(`База:     ${DB_NAME}\n`);

  let connection;
  try {
    connection = await getRootConnection();
    console.log('✓ Підключення до MySQL успішне');

    const exists = await databaseExists(connection);
    if (!exists) {
      console.log(`✗ База даних "${DB_NAME}" не існує`);
      return;
    }

    console.log(`✓ База даних "${DB_NAME}" існує`);

    await connection.changeUser({ database: DB_NAME });

    for (const table of TABLES) {
      const [tables] = await connection.query('SHOW TABLES LIKE ?', [table]);
      if (tables.length === 0) {
        console.log(`  ✗ Таблиця "${table}" — відсутня`);
        continue;
      }
      const [countRows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
      console.log(`  ✓ ${table}: ${countRows[0].count} записів`);
    }
  } catch (error) {
    const message = error.message || error.code || String(error);
    console.error('\n✗ Помилка:', message);
    console.log('\nПереконайтесь, що XAMPP MySQL запущений.');
  } finally {
    if (connection) await connection.end();
  }
}

async function ensureSeedPasswords(connection) {
  const hash = bcrypt.hashSync('password123', 10);
  await connection.query('UPDATE users SET password_hash = ?', [hash]);
}

async function initializeDatabase() {
  console.log('\n--- Ініціалізація бази даних ---\n');

  let connection;
  try {
    connection = await getRootConnection();

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✓ База "${DB_NAME}" готова`);

    await connection.changeUser({ database: DB_NAME });

    const schema = readSqlFile('schema.sql');
    await connection.query(schema);
    console.log('✓ Таблиці створено (schema.sql)');

    const [countRows] = await connection.query('SELECT COUNT(*) AS count FROM users');
    if (countRows[0].count > 0) {
      console.log('ℹ База вже містить дані — сід пропущено');
      console.log('  Для повного скидання використайте пункт 3');
    } else {
      const seed = readSqlFile('seed.sql');
      await connection.query(seed);
      console.log('✓ Тестові дані додано (seed.sql)');

      await ensureSeedPasswords(connection);
      console.log('✓ Паролі користувачів: password123');
    }

    console.log('\nІніціалізація завершена успішно.');
  } catch (error) {
    const message = error.message || error.code || String(error);
    console.error('\n✗ Помилка ініціалізації:', message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\nПереконайтесь, що XAMPP MySQL запущений.');
    }
  } finally {
    if (connection) await connection.end();
  }
}

async function reinstallDatabase() {
  console.log('\n--- Перевстановлення бази даних ---\n');
  console.log('Увага: усі дані будуть видалені!\n');

  const confirm = await ask('Продовжити? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Скасовано.');
    return;
  }

  let connection;
  try {
    connection = await getRootConnection();
    await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
    console.log(`✓ База "${DB_NAME}" видалена`);
    await connection.end();
    connection = null;

    await initializeDatabase();
  } catch (error) {
    console.error('\n✗ Помилка:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

function showMenu() {
  console.log('\n========================================');
  console.log('  Налаштування БД — Виборча комісія');
  console.log('========================================');
  console.log('  1. Перевірити стан бази даних');
  console.log('  2. Ініціалізувати базу даних');
  console.log('  3. Перевстановити базу даних');
  console.log('  0. Вихід');
  console.log('========================================');
}

async function main() {
  let running = true;

  while (running) {
    showMenu();
    const choice = await ask('\nОберіть пункт: ');

    switch (choice.trim()) {
      case '1':
        await checkStatus();
        break;
      case '2':
        await initializeDatabase();
        break;
      case '3':
        await reinstallDatabase();
        break;
      case '0':
        running = false;
        break;
      default:
        console.log('Невірний пункт. Спробуйте ще раз.');
    }
  }

  rl.close();
}

main().catch((error) => {
  console.error(error);
  rl.close();
  process.exit(1);
});
