import sequelize from '../config/database.js';  // default export니까 이렇게
// // const sequelize = require('../config/database');
// const User = require('./User');
// const Submission = require('./Submission');
// const TeacherStudent = require('./TeacherStudent');

import User from './User.js';
import Submission from './Submission.js';
import TeacherStudent from './TeacherStudent.js';

User.belongsToMany(User, {
  as: 'Students',
  through: TeacherStudent,
  foreignKey: 'teacher_id',
  otherKey: 'student_id'
});

User.belongsToMany(User, {
  as: 'Teachers',
  through: TeacherStudent,
  foreignKey: 'student_id',
  otherKey: 'teacher_id'
});
TeacherStudent.belongsTo(User, { as: 'Teacher', foreignKey: 'teacher_id' })
TeacherStudent.belongsTo(User, { as: 'Student', foreignKey: 'student_id' })



// index.js
// export { sequelize } from '../config/database.js';
// export { User } from './User.js';
// export { Submission } from './Submission.js';
// export { TeacherStudent } from './TeacherStudent.js';
// // **ESM 방식으로 내보내기**

export { sequelize, User, Submission, TeacherStudent };
// module.exports = { sequelize, User, Submission, TeacherStudent };