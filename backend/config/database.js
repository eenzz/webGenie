// config/database.js
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const dbUrl = process.env.DATABASE_URL; // Render에서 주는 Internal DB URL을 여기에

const sequelize = dbUrl
  ? new Sequelize(dbUrl, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: false,
      dialectOptions: isProd
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false, // Render 계열에서 보통 필요
            },
          }
        : {},
      pool: { max: 10, min: 0, idle: 10000 },
      define: {
        underscored: true,     // student_id, created_at 등 snake_case
        freezeTableName: true, // 모델명 그대로 테이블명 사용
      },
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: path.resolve(__dirname, '../database.sqlite'),
      logging: console.log,
      define: {
        underscored: true,
        freezeTableName: true,
      },
    });

export default sequelize;