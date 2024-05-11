/**
 * Created by Samuel Truniger.
 *
 * Controller for file uploads.
 */

var fs = require('fs'),
  path = require('path'),
  db = require('../models'),
  config = require('../config/config.js'),
  Busboy = require('busboy');


/**
 * Upload images to image store (images/projects)
 *
 * @param req
 * @param res
 */
var uploadImages = function (req, res) {
  let busboy = new Busboy({ headers: req.headers });
  let filePromises = [];
  let imgResults = [];

  db.User.findOne({
    where: { username: req.params.username }
  })
    .then(function (usr) {
      busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
        // config
        let relativePath = path.join("images/projects/", filename);
        let saveTo = path.join(config.root, config.envFolder, relativePath);

        // checks file format
        if (
          mimetype !== "image/jpeg" &&
          mimetype !== "image/png" &&
          mimetype !== "image/gif"
        ) {
          file.resume();
          imgResults.push({ file: filename, type: "fileFormat" });
          return;
        }

        // checks if file already exists
        fs.access(saveTo, fs.constants.F_OK, (err) => {
          // if the file already exists skip add it to imgResults and continue with the next file (if multiple were uploaded)
          if (!err) {
            file.resume();
            imgResults.push({ file: filename, type: "duplicate" });
            return;
          }

          let fileWriteStream = fs.createWriteStream(saveTo);
          // saves the img
          file.pipe(fileWriteStream);

          let filePromise = new Promise((resolve, reject) => {
            fileWriteStream.on("finish", () => {
              db.Image.create({
                imgName: filename,
                path: relativePath,
                UserId: usr.id
              })
                .then(resolve)
                .catch(reject);
            });

            fileWriteStream.on("error", () => {
              console.error("Error writing file: " + filename);
              reject("Error writing file: " + filename);
            });

            file.on("error", () => {
              console.error("Error in file stream: " + filename);
              reject("Error in file stream: " + filename);
            });
          });
          // push all uploaded files to the uploads array as well as the promises
          imgResults.push({ file: filename, type: "success" });
          filePromises.push(filePromise);
        });
      });

      busboy.on("finish", () => {
        // wait till all the files are stored in both (db/file storage) successfully
        Promise.all(filePromises)
          .then(function () {
            res.status(200).json({ imgResults });
          })
          .catch(function (err) {
            console.error(err);
            res.status(500).json({ message: "Error while uploading the image." });
          });
      });

      req.pipe(busboy);
    })
    .catch(function (err) {
      console.error(err);
      res.status(500).json({ message: "Error while uploading the image." });
    });
};

module.exports = {
  uploadImages: uploadImages
};
