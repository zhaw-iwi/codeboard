/**
 * Created by Janick Michot on 06.02.2020.
 *
 * The ORM model of courseUser
 *
 * This model is used to assign users to courses with different roles.
 */


module.exports = function(sequelize, DataTypes) {
    var Course = sequelize.define(
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

    Course.associate = function(models) {
        Course.belongsTo(models.User);
        Course.belongsTo(models.Course);
    };

    return Course;
};
