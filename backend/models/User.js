
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // 명시하면 더 안전
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('student', 'teacher'), allowNull: false },
  student_number: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'User',        // 🔴 단수로 고정 (지금 DB에 맞춤)
  freezeTableName: true,    // Sequelize가 복수화하지 않게
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
});

// module.exports = User;
export default User;