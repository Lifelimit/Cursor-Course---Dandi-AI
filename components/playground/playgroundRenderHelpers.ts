import type { LoadingStageStatus } from "@/components/ui/LoadingStages";
import type { LogEntry } from "@/components/playground/NetworkLog";
import { isLightweightGreeting } from "@/hooks/useRepositoryChat";
import type { RagMessage, RagSource } from "@/types/rag";

export type ConversationTurn = {
  question?: RagMessage;
  answer?: RagMessage;
};

export function getPipelineStatus(logs: LogEntry[], id: string): LoadingStageStatus {
  const log = logs.find((entry) => entry.id === id);
  if (!log) return "idle";
  if (log.status === "pending") return "active";
  if (log.status === "success") return "done";
  return "error";
}

export function buildConversationTurns(messages: RagMessage[]): ConversationTurn[] {
  const visibleMessages = messages.filter((message, index) => {
    const hasPreviousQuestion = messages.slice(0, index).some((candidate) => candidate.role === "user");
    return message.role === "user" || hasPreviousQuestion;
  });

  return visibleMessages.reduce<ConversationTurn[]>((turns, message) => {
    if (message.role === "user") {
      turns.push({ question: message });
      return turns;
    }

    const lastTurn = turns[turns.length - 1];
    if (lastTurn && !lastTurn.answer) {
      lastTurn.answer = message;
    } else {
      turns.push({ answer: message });
    }

    return turns;
  }, []);
}

export function getTopSourceMatch(sources?: RagSource[]) {
  if (!sources?.length) return 0;
  return Math.max(...sources.map((src) => Math.round(src.similarity * 100)));
}

export function shouldShowSources(question?: RagMessage, answer?: RagMessage) {
  if (!answer?.sources?.length) return false;
  if (question && isLightweightGreeting(question.content)) return false;
  return true;
}

export function isRepositoryStructureQuestion(message?: string) {
  if (!message) return false;
  return /\b(structure|organized|organisation|organization|directories|folders|layout|tree)\b/i.test(message);
}

export function answerStartsWithHeading(content?: string) {
  return Boolean(content?.trim().match(/^#{1,3}\s+/));
}
