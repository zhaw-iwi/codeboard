/**
 * Created by Samuel Truniger.
 *
 * The ORM model of the ai usage data
 */

module.exports = function (sequelize, DataTypes) {
  var AIUsage = sequelize.define('AIUsage', {
    // the amount of tokens of the prompt
    promptTokens: DataTypes.INTEGER,

    // the amount of tokens of the completion (response)
    completionTokens: DataTypes.INTEGER,

    // the total amount of tokens (prompt + completion)
    totalTokens: DataTypes.INTEGER,

    // the ai tool which was used
    tool: DataTypes.STRING,
  });

  AIUsage.associate = function (models) {
    AIUsage.belongsTo(models.User, { foreignKey: 'userId' });
    AIUsage.belongsTo(models.Course, { foreignKey: 'courseId' });
    AIUsage.belongsTo(models.Project, { foreignKey: 'projectId' });
  };

  return AIUsage;
};
