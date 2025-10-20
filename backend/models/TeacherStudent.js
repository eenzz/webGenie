// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');
// const User = require('./User');
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

// const TeacherStudent = sequelize.define('TeacherStudent', {
//   teacher_id: {
//     type: DataTypes.INTEGER,
//     references: { model: User, key: 'id' }
//   },
//   student_id: {
//     type: DataTypes.INTEGER,
//     references: { model: User, key: 'id' }
//   }
// }, {
//   timestamps: false,
//   tableName: 'teacher_student'
// });


const TeacherStudent = sequelize.define('TeacherStudent', {
  teacher_id: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' },
    primaryKey: true  // 🔥 추가
  },
  student_id: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' },
    primaryKey: true  // 🔥 추가
  }
}, {
  timestamps: false,
  tableName: 'teacher_student'
}); 

// module.exports = TeacherStudent;
export default TeacherStudent;