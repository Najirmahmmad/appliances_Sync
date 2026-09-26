const mysql = require('mysql2/promise');
require('dotenv').config({path: './server/.env'});

(async () => {
  const connLat = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'ifberp',
    charset: 'latin1',
    typeCast: function (field, next) {
      if (field.type === 'VAR_STRING' || field.type === 'STRING' || field.type === 'BLOB' || field.type === 'VARCHAR') {
        const buffer = field.buffer();
        if (buffer) {
          // Because we connect as latin1, MySQL sends raw UTF-8 bytes to us
          return buffer.toString('utf8');
        }
        return null;
      }
      return next();
    }
  });

  const [salesLat] = await connLat.query("SELECT party_name FROM sales_header WHERE book_code='SA' AND vouch_no=1005");
  console.log('LATIN1 + typeCast:', salesLat[0]);
  process.exit(0);
})();
