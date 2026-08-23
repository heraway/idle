/**
 * NOTIFICATION SERVICE (stub)
 * Logs to console in dev. Swap sendPush() for Expo push notifications
 * (free, works great with React Native/Expo) in production — just POST
 * to https://exp.host/--/api/v2/push/send with the device's Expo push token.
 */
export async function sendPush(userId: string, title: string, body: string) {
  console.log(`[push -> ${userId}] ${title}: ${body}`);
}

export async function notifyNewBid(hirerId: string, jobTitle: string, amount: number) {
  await sendPush(hirerId, "New bid received", `Someone bid $${amount} on "${jobTitle}"`);
}

export async function notifyBidAccepted(workerId: string, jobTitle: string) {
  await sendPush(workerId, "You got the job!", `Your bid on "${jobTitle}" was accepted`);
}

export async function notifyJobSubmitted(hirerId: string, jobTitle: string) {
  await sendPush(hirerId, "Job marked complete", `"${jobTitle}" is ready for your review`);
}
