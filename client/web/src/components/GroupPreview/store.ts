import { create } from 'zustand';
import type { model } from 'tailchat-shared';

interface ChatConverseState extends model.converse.ChatConverseInfo {
  messages: model.message.LocalChatMessage[];
}

interface GroupPreviewState {
  groupInfo: model.group.GroupInfo | null;
  converses: Record<string, ChatConverseState>;
}

function getDefaultState() {
  return {
    groupInfo: null,
    converses: {},
  };
}

export const useGroupPreviewStore = create<GroupPreviewState>((get) => ({
  ...getDefaultState(),
}));

/**
 * 重置状态
 */
export function resetGroupPreviewState() {
  useGroupPreviewStore.setState(getDefaultState());
}
