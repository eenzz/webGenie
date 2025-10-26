// models/index.js
import sequelize from '../config/database.js';

import User from './User.js';
import Submission from './Submission.js';
import TeacherStudent from './TeacherStudent.js';

/**
 * 다대다(자기참조) : User ↔ User (TeacherStudent 조인테이블)
 */
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

// TeacherStudent.belongsTo(User, { as: 'Teacher', foreignKey: 'teacher_id' });
// TeacherStudent.belongsTo(User, { as: 'Student', foreignKey: 'student_id' });
TeacherStudent.belongsTo(User, { as: 'TeacherUser', foreignKey: 'teacher_id' });
TeacherStudent.belongsTo(User, { as: 'StudentUser', foreignKey: 'student_id' });

/**
 * 일대다 : User(학생) ↔ Submission
 *  - submissions 조회 시 조인 편해지고, onDelete: CASCADE로 학생 삭제 시 제출물도 정리
 */
User.hasMany(Submission, {
  as: 'StudentSubmissions',
  foreignKey: 'student_id',
  onDelete: 'CASCADE'
});
Submission.belongsTo(User, {
  as: 'Student',
  foreignKey: 'student_id'
});


export { sequelize, User, Submission, TeacherStudent };