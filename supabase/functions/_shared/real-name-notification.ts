export type RealNameNotificationType =
  | "real_name_submitted"
  | "real_name_approved"
  | "real_name_rejected";

export function buildRealNameNotificationInsert(input: {
  userId: string;
  type: RealNameNotificationType;
  title: string;
  content: string;
  deliveredAt: string;
}) {
  const isReviewResult = input.type === "real_name_approved" || input.type === "real_name_rejected";

  return {
    user_id: input.userId,
    type: input.type,
    title: input.title,
    content: input.content,
    link_to: "/settings",
    reach_channel: "in_app" as const,
    delivery_status: "sent" as const,
    delivered_at: input.deliveredAt,
    recall_count: 0,
    metadata: {
      event_key: isReviewResult ? "review_result" : "review_submission",
      audience_role: "applicant",
      fallback_channels: isReviewResult ? ["subscription"] : [],
      frequency_window_minutes: isReviewResult ? 5 : 30,
      max_recall_count: isReviewResult ? 1 : 0,
      recall_delay_minutes: isReviewResult ? 30 : null,
    },
  };
}
