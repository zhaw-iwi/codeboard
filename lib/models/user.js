/**
 * Created by haches on 7/7/14.
 *
 * The ORM model of a user.
 */

const util = require('./../util.js');
const operations = require('sequelize').Op;

module.exports = function (sequelize, DataTypes) {
  var User = sequelize.define(
    'User',
    {
      username: {
        type: DataTypes.STRING,
        unique: true,
      },
      role: {
        type: DataTypes.STRING,
        default: 'user', // "ltiUser", "admin" ...
      },
      email: {
        type: DataTypes.STRING,
      },
      emailPublic: DataTypes.STRING,
      name: DataTypes.STRING,
      password: {
        type: DataTypes.STRING(2048),
        set: function (aPassword) {
          // Note: we can't use Sequelize validation here because we use a custom "setter" function. With those,
          // validation doesn't work. Instead, we need to validate the length of password when handling the request.
          // See also:  https://github.com/sequelize/sequelize/issues/2367

          // sets the password when a new user instance is created; we don't store the password directly but hash it.
          this.salt = util.getSalt(); // create a new salt
          this.setDataValue('password', util.getEncryptedPassword(aPassword, this.salt)); // generate a hashed password together with salt
        },
      },
      salt: DataTypes.STRING(1024),
      url: DataTypes.STRING,
      location: DataTypes.STRING,
      institution: DataTypes.STRING,
    },
    {
      scopes: {
        ltiUser: {
          where: {
            role: 'ltiUser',
          },
        },
        nonLtiUser: {
          where: {
            role: { [operations.not]: 'ltiUser' },
          },
        },
      },
    }
  );

  User.associate = function (models) {
    User.belongsToMany(models.Project, { as: 'ownerSet', through: 'ProjectsOwners' });
    User.belongsToMany(models.Project, { as: 'userSet', through: 'ProjectsUsers' });
    User.belongsToMany(models.Course, { as: 'courseOwnerSet', through: 'CourseOwners' });
    User.belongsToMany(models.Course, { as: 'courseUserSet', through: 'CourseUsers' });
    User.hasMany(models.Image, { as: 'imgSet' });
    User.hasMany(models.AIUsage, { as: 'AIUsageSet', foreignKey: 'userId' });
    User.hasOne(models.APIRequestLimit, { foreignKey: 'userId' });
  };

  return User;
};
