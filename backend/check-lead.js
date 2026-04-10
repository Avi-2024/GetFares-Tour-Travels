import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'get2vacations.c16ecme0uera.ap-south-1.rds.amazonaws.com',
  user: 'admin',
  password: 'Getfares123456',
  database: 'get2vacations'
});

const [rows] = await connection.execute(
  'SELECT * FROM leads WHERE phone IN (?, ?) ORDER BY created_at DESC LIMIT 2',
  ['9155555555', '9199999999']
);

console.log(JSON.stringify(rows, null, 2));
await connection.end();
