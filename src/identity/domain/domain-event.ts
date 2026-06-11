export type DomainEventDraft = {
  topic: string;
  type: string;
  payload: Record<string, unknown>;
};

