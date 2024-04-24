/**
 * Created by haches on 7/27/14.
 *
 * Controller for file uploads.
 */

var fs = require('fs'),
  path = require('path'),
  db = require('../models'),
  config = require('../config/config.js'),
  gm = require('gm'),
  Busboy = require('busboy');


/**
 * Function to resize the picture stored at aImgPath. The original picutre
 * will be overwritten with the resized one.
 * @param {string} aImgPath path and filename of the picture to resize
 * @param {int} aSize the pixel size to which to resize (ratio will be preserved)
 */
var resizePicture = function (aImgPath, aSize) {
  // determine the full path of to where the pictures are stored
  var imgPath = path.join(config.root, config.envFolder, aImgPath);

  try {
    gm(imgPath)
      .background('white')
      .flatten()
      .strip()
      .resize(aSize, aSize)
      .write(imgPath, function (err) {
        if (err) {
          console.log('Server.uploadCtrljs.resizePicture: Error with: ' + imgPath + '; Detail: ' + JSON.stringify(err));
        }
      });
  }
  catch (e) {
    console.log('Server.uploadCtrljs.resizePicture: Error trying to resize: ' + imgPath);
  }
};

/**
 * Upload Image on Project basis
 *
 * @author Janick Michot
 *
 * @param req
 * @param res
 */
let projectImage = function (req, res) {

  let relativePath = '';

  let busboy = new Busboy({ headers: req.headers });

  busboy.on('file', function (aFieldname, aFile, aFilename, aEncoding, aMimetype) {

    // todo maybe create a config var for path?!
    relativePath = path.join('images/projects/', aFilename);

    // the path were we store the file
    let saveTo = path.join(config.root, config.envFolder, relativePath);

    let writeStream = fs.createWriteStream(saveTo);
    aFile.pipe(writeStream);

    // called when an error occurs
    writeStream.on('error', function (err) {
      console.log('Server.uploadCtrljs.projectImage: Error during busboy.onFile event: ' + JSON.stringify(err));
    });

    // called when the file is fully uploaded
    aFile.on('end', function () {
      res.status(200).json({imageUrl: relativePath});
    });
  });

  return req.pipe(busboy);
};

/**
 * Upload images to image store (images/projects)
 *
 * @author Samuel Truniger
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
  projectImage: projectImage,
  uploadImages: uploadImages
};
