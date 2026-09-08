import { prisma } from "../config/prisma";

/**
 * Sends an Expo push notification to the given userId if they have a registered pushToken.
 * Uses native fetch to post directly to Expo's Push API.
 */
export async function sendPush(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  console.log(`[push -> ${userId}] ${title}: ${body}`);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true } as any,
    });

    const pushToken = (user as { pushToken?: string | null })?.pushToken;

    if (!pushToken || !pushToken.startsWith("ExponentPushToken")) {
      return;
    }

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: pushToken,
        sound: "default",
        title,
        body,
        data,
      }),
    });

    const result = await response.json();
    console.log(`[push -> ${userId}] Result:`, result);
  } catch (error) {
    console.error(`[push -> ${userId}] Error sending push notification:`, error);
  }
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

export async function notifyNewQuestion(hirerId: string, jobTitle: string) {
  await sendPush(hirerId, "New question on your job", `Someone asked a question about "${jobTitle}"`);
}

export async function notifyQuestionAnswered(askerId: string, jobTitle: string) {
  await sendPush(askerId, "Your question was answered", `The poster of "${jobTitle}" replied to your question`);
}

export async function notifyJobCancelled(workerId: string, jobTitle: string) {
  await sendPush(workerId, "Job cancelled", `"${jobTitle}" was cancelled by the poster. Any held funds have been refunded.`);
}