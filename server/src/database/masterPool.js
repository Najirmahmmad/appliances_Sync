import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const masterPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.MASTER_DB_NAME || 'ifbmaster',
  waitForConnections: true,
  connectionLimit: Number(process.env.MASTER_POOL_LIMIT) || 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  charset: 'latin1',
  typeCast: function (field, next) {
    if (field.type === 'VAR_STRING' || field.type === 'STRING' || field.type === 'BLOB' || field.type === 'VARCHAR') {
      const buffer = field.buffer();
      if (buffer) {
        return buffer.toString('utf8');
      }
      return null;
    }
    return next();
  }
});

export const checkMasterConnection = async () => {
  try {
    const connection = await masterPool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('Master Database Connection Error:', error.message);
    return false;
  }
};

export default masterPool;
