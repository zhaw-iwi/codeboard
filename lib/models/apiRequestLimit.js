/**
 * Created by Samuel Truniger.
 *
 * The ORM model of the ai api request limits
 */

module.exports = function (sequelize, DataTypes) {
  var APIRequestLimit = sequelize.define("APIRequestLimit", {
    // the amount of available requests
    availableRequests: DataTypes.INTEGER,

    // the current week number
    weekNumber: DataTypes.INTEGER,
  });

  APIRequestLimit.associate = function (models) {
    APIRequestLimit.belongsTo(models.User, { foreignKey: "userId" });
  };

  return APIRequestLimit;
};
