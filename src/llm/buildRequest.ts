import { MessageModes, getSystemMessageByMode, completionOptionsByMode, buildMessages as build } from './systemMessagesLegal';

export function buildMessages(params: { mode: MessageModes; userInput: string; contextText?: string; history?: Array<{ role: 'system'|'user'|'assistant'; content: string }> }) {
  return build(params);
}

export function getCompletionOptions(mode: MessageModes) {
  return completionOptionsByMode(mode);
}


