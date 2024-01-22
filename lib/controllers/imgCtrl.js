/**
 * Created by Samuel Truniger.
 *
 * Controller for handling uploaded files.. the upload function is in uploadCtrl.js.
 */


var fs = require("fs"),
  path = require("path"),
  db = require("../models"),
  config = require("../config/config.js");

var getUploadImages = function (req, res) {
  var reqUser = req.params.username;

  if (req.isAuthenticated() && reqUser === req.user.username) {
    db.User.findOne({
      where: { username: req.user.username },
      include: [
        {
          model: db.Image,
          as: "imgSet",
          attributes: ["id", "imgName", "path"]
        }
      ]
    })
      .then(function (usr) {
        res.status(200).json(usr);
      })
      .catch(function (err) {
        console.log(err);
        res.status(500).json({ message: "Server error." });
      });
  }
};

var deleteImage = function (req, res) {
  db.User.findOne({
    where: { username: req.user.username }
  })
    .then(function (usr) {
      return db.Image.findOne({
        where: { id: req.params.imgId, userId: usr.id }
      });
    })
    .then(function (img) {
      const filePath = path.join(
        config.root,
        config.envFolder,
        "images",
        "projects",
        img.imgName
      );
      return db.Image.destroy({ where: { id: img.id } }).then(() =>
        fs.promises.unlink(filePath)
      );
    })
    .then(function () {
      res.status(200).json({ message: "Image successfully deleted." });
    })
    .catch(function (err) {
      console.error(err);
      res.status(500).json({ message: "Server error." });
    });
};

module.exports = {
  getUploadImages: getUploadImages,
  deleteImage: deleteImage
};
