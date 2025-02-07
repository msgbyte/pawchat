import React from 'react';
import { ChatMessageList } from '../ChatBox/ChatMessageList';

interface GroupPreviewMessageListProps {
  groupId: string;
  converseId: string;
}
export const GroupPreviewMessageList: React.FC<GroupPreviewMessageListProps> =
  React.memo(() => {
    return (
      <ChatMessageList
        messages={[]}
        isLoadingMore={false}
        hasMoreMessage={false}
        onLoadMore={async () => {}}
      />
    );
  });
GroupPreviewMessageList.displayName = 'GroupPreviewMessageList';
