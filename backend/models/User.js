// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';


const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('student', 'teacher'), allowNull: false },
  student_number: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// module.exports = User;
export default User;