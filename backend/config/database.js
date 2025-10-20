// const { Sequelize } = require('sequelize');

// import Sequelize from 'sequelize';

// const sequelize = new Sequelize('webide_db', 'root', 'test', {
//   host: 'localhost',
//   dialect: 'mysql',
//   logging: false
// });

// // module.exports = sequelize;

// export default sequelize;  // ESM에서는 export default!


// config/database.js
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(__dirname, '../database.sqlite'), // DB 파일 생성 위치
  logging: console.log, // SQL 쿼리 로그 보고 싶으면 남기기
});

export default sequelize;