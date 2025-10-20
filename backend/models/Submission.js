
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';
// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');
// const User = require('./User');

const Submission = sequelize.define('Submission', {
    student_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    html_code: DataTypes.TEXT,
    css_code: DataTypes.TEXT,
    js_code: DataTypes.TEXT,
    feedback: DataTypes.TEXT,
}, {
    timestamps: true,
    createdAt: 'submitted_at',
    updatedAt: false
});

User.hasMany(Submission, { foreignKey: 'user_id' });
Submission.belongsTo(User, { foreignKey: 'user_id' });

// module.exports = Submission;
export default Submission;