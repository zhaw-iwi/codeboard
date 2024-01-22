/**
 * Created by samutru.
 *
 * The ORM model for a image.
 */

module.exports = function (sequelize, DataTypes) {
  var Image = sequelize.define("Image", {
    imgName: DataTypes.STRING,
    path: DataTypes.STRING
  });

  Image.associate = function (models) {
    Image.belongsTo(models.User, {
      onDelete: "CASCADE"
    });
  };

  return Image;
};
