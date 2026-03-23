const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ykyxgjhugiajgrqvwszl:!Fitforge2026@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(console.error);
