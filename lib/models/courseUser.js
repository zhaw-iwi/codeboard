/**
 * Created by Janick Michot on 06.02.2020.
 *
 * The ORM model of courseUser
 *
 * This model is used to assign users to courses with different roles.
 */


module.exports = function(sequelize, DataTypes) {
    var CourseUser = sequelize.define(
        'CourseUserNew',
        {
            // the role of a user within a course
            role: {
                type: DataTypes.ENUM,
                values: ['owner', 'teacher'],
                default: 'teacher'
            }
        }
    );

    CourseUser.associate = function(models) {
        CourseUser.belongsTo(models.User, {as: 'user', foreignKey: 'userId', targetKey: 'id'});
        CourseUser.belongsTo(models.Course, {as: 'course', foreignKey: 'courseId', targetKey: 'id'});
    };

    return CourseUser;
};
