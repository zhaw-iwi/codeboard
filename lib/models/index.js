/*
 *
 * Author: haches
 *
 * This code holds the configuration for the DB.
 * It also allows to load all model files that exist
 * in the folder 'models'.
 *
 * The models can afterwards be accesses using db.ModelName
 *
 */

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const lodash = require('lodash');
const config = require('../config/config.js');
const sequelize = new Sequelize(config.db.database, config.db.username, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialect: 'mysql',
});
const db = {};

fs.readdirSync(__dirname)
  .filter(function (file) {
    return file.indexOf('.') !== 0 && file !== 'index.js';
  })
  .forEach(function (file) {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(function (modelName) {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

module.exports = lodash.extend(
  {
    sequelize: sequelize,
    Sequelize: Sequelize,
  },
  db
);
