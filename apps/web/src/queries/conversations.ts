import { queryOptions, useQuery } from "@tanstack/react-query";
import { conversationsApi } from "@/api/conversations";

export const conversationMessagesOptions = (
  conversationId: string | undefined,
) =>
  queryOptions({
    queryKey: ["conversation-messages", conversationId],
    queryFn: () => conversationsApi.getMessages(conversationId!),
    enabled: !!conversationId,
  });

export const useConversationMessages = (conversationId: string | undefined) =>
  useQuery(conversationMessagesOptions(conversationId));
