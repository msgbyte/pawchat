import { useSocketContext } from '@/context/SocketContext';
import { useEffect } from 'react';
import { GroupInfo, GroupPanelType } from 'tailchat-shared';
import { resetGroupPreviewState, useGroupPreviewStore } from './store';

export function useSocket(groupId: string) {
  const socket = useSocketContext();

  useEffect(() => {
    socket.request('group.preview.joinGroupRooms', {
      groupId,
    });

    socket
      .request<GroupInfo>('group.preview.getGroupInfo', {
        groupId,
      })
      .then((groupInfo) => {
        console.log('groupInfo', groupInfo);
        useGroupPreviewStore.setState({
          groupInfo,
        });

        if (Array.isArray(groupInfo.panels)) {
          const textPanels = groupInfo.panels.map(
            (p) => p.type === GroupPanelType.TEXT
          );

          // TODO
        }
      });

    return () => {
      socket.request('group.preview.leaveGroupRooms', {
        groupId,
      });

      resetGroupPreviewState();
    };
  }, [groupId]);
}
