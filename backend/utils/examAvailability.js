const getExamAvailability = (exam, now = new Date()) => {
  const startsAt = exam.availableFrom || exam.scheduledAt || null;
  const endsAt = exam.availableTill || null;
  const startsAtTime = startsAt ? new Date(startsAt).getTime() : null;
  const endsAtTime = endsAt ? new Date(endsAt).getTime() : null;
  const nowTime = now.getTime();

  return {
    startsAt,
    endsAt,
    isUpcoming: startsAtTime !== null && nowTime < startsAtTime,
    isExpired: endsAtTime !== null && nowTime >= endsAtTime,
    isAvailable:
      (startsAtTime === null || nowTime >= startsAtTime) &&
      (endsAtTime === null || nowTime < endsAtTime),
  };
};

module.exports = { getExamAvailability };
