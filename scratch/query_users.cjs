const mysql = require('mysql2');

console.log("Connecting to database...");
const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'password',
  database: 'sdu_admin',
  connectTimeout: 5000
});

connection.query('SELECT id, name, email, role, status FROM users LIMIT 15', (err, results) => {
  if (err) {
    console.error("Query Error:", err);
  } else {
    console.log("Database results:");
    console.log(JSON.stringify(results, null, 2));
  }
  connection.end();
  process.exit();
});
