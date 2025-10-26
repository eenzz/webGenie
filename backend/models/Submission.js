
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';
// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');
// const User = require('./User');

const Submission = sequelize.define('Submission', {
    // student_id: {
    //     type: DataTypes.INTEGER,
    //     allowNull: false
    // },
    student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: User, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    html_code: DataTypes.TEXT,
    css_code: DataTypes.TEXT,
    js_code: DataTypes.TEXT,
    feedback: DataTypes.TEXT,

     // timestamps 옵션과 매칭 (createdAt: 'submitted_at')
    submitted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },

}, {

    tableName: 'Submission',     // 🔒 테이블명 고정
    freezeTableName: true,       // 복수화 방지
    timestamps: true,
    createdAt: 'submitted_at',
    updatedAt: false,
});

// 🔗 연관관계도 student_id 기준으로만!
// User.hasMany(Submission, { as: 'Submissions', foreignKey: 'student_id' });
// Submission.belongsTo(User, { as: 'Student', foreignKey: 'student_id' });


// User.hasMany(Submission, { foreignKey: 'student_id' });
// Submission.belongsTo(User, { foreignKey: 'student_id' });

// module.exports = Submission;
export default Submission;