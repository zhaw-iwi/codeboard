/**
 *
 * @author Samuel Truniger
 * @date 04.09.2024
 * This service handles everything regarding request limits for users. 
 */
const db = require('../models');

var getWeekNumber = function (date) {
  const currentDate = new Date(date.getTime());
  currentDate.setDate(currentDate.getDate() + 4 - (currentDate.getDay() || 7));
  const yearStart = new Date(currentDate.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((currentDate - yearStart) / 86400000 + 1) / 7);
  return weekNumber;
};

var getUserReqLimit = async function (usrId) {
  const today = new Date();
  const weekNumber = getWeekNumber(today);
  const numRequests = 100;

  try {
    const userLimit = await db.APIRequestLimit.findOne({
      where: { userId: usrId },
    });

    // the following conditions check how to handle the request limit
    if (!userLimit) {
      await db.APIRequestLimit.create({
        userId: usrId,
        availableRequests: numRequests,
        weekNumber: weekNumber,
      });
    } else if (userLimit.availableRequests > 0 && userLimit.weekNumber === weekNumber) {
      await userLimit.update({
        availableRequests: userLimit.availableRequests - 1,
      });
    } else if (userLimit.weekNumber !== weekNumber) {
      await userLimit.update({
        availableRequests: numRequests,
        weekNumber: weekNumber,
      });
    } else if (userLimit.availableRequests <= 0) {
        return { limitExceeded: true };
    }
    return userLimit;

  } catch (err) {
    console.log(err);
    throw new Error("Error checking request limit");
  }
};

exports.getUserReqLimit = getUserReqLimit;
