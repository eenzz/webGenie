// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');
// const User = require('./User');
// import { DataTypes } from 'sequelize';
// import sequelize from '../config/database.js';
// import User from './User.js';


// const TeacherStudent = sequelize.define('TeacherStudent', {
//   teacher_id: {
//     type: DataTypes.INTEGER,
//     references: { model: User, key: 'id' },
//     primaryKey: true  // 🔥 추가
//   },
//   student_id: {
//     type: DataTypes.INTEGER,
//     references: { model: User, key: 'id' },
//     primaryKey: true  // 🔥 추가
//   }
// }, {
//   timestamps: false,
//   tableName: 'teacher_student'
// }); 

// // module.exports = TeacherStudent;
// export default TeacherStudent;

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const TeacherStudent = sequelize.define('TeacherStudent', {
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    primaryKey: true,
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    primaryKey: true,
  },
}, {
  tableName: 'teacher_student',
  freezeTableName: true,
  timestamps: false,
  indexes: [
    { fields: ['teacher_id'] },
    { fields: ['student_id'] },
  ],
});

// 조인에서 쓰는 alias들과 일치(이미 index.js에서 include 시 'Teacher'/'Student' 사용 중)
TeacherStudent.belongsTo(User, { as: 'Teacher', foreignKey: 'teacher_id' });
TeacherStudent.belongsTo(User, { as: 'Student', foreignKey: 'student_id' });

export default TeacherStudent;