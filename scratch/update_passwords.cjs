const mysql = require('mysql2');

console.log("Connecting to database to update passwords...");
const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'password',
  database: 'sdu_admin'
});

const hash = '$2a$10$flTZLa.MBTzmADcK0tcdYOou0F7woBCN3xqGUD9u6ORxneecbkUmG'; // password123

connection.query(
  'UPDATE users SET password = ? WHERE email IN ("01007033", "01007029", "01006030", "1000001", "admin@saodo.edu.vn")',
  [hash],
  (err, results) => {
    if (err) {
      console.error("Update Error:", err);
    } else {
      console.log("Passwords updated successfully for selected users!");
      console.log("Rows affected:", results.affectedRows);
    }
    connection.end();
    process.exit();
  }
);

