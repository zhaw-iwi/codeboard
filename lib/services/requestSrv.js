/**
 *
 * @author Samuel Truniger
 * @date 04.09.2024
 * This service handles everything regarding request limits for users.
 */
const db = require('../models');

const getWeekNumber = function (date) {
  const currentDate = new Date(date.getTime());
  currentDate.setDate(currentDate.getDate() + 4 - (currentDate.getDay() || 7));
  const yearStart = new Date(currentDate.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((currentDate - yearStart) / 86400000 + 1) / 7);
  return weekNumber;
};

const getUserReqLimit = async function (usrId) {
  const today = new Date();
  const weekNumber = getWeekNumber(today);
  const numRequests = 100;

  const userLimit = await db.APIRequestLimit.findOne({
    where: { userId: usrId },
  });

  // the following conditions check how to handle the request limit
  if (!userLimit) {
    // if no limit is set for the user, create a new one
    await db.APIRequestLimit.create({
      userId: usrId,
      availableRequests: numRequests,
      weekNumber: weekNumber,
    });
  } else if (userLimit.availableRequests > 0 && userLimit.weekNumber === weekNumber) {
    // if the user has requests left and is in the same week, decrement the available requests
    await userLimit.update({
      availableRequests: userLimit.availableRequests - 1,
    });
  } else if (userLimit.weekNumber !== weekNumber) {
    // if the user is in a new week, reset the available requests
    await userLimit.update({
      availableRequests: numRequests,
      weekNumber: weekNumber,
    });
  } else if (userLimit.availableRequests <= 0) {
    // if the user has no requests left, return an object indicating that the limit is exceeded
    return { limitExceeded: true };
  }
  return userLimit;
};

module.exports = {
  getUserReqLimit,
};
