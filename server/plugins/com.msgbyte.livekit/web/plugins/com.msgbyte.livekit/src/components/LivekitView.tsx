import { showErrorToasts, useEvent } from '@capital/common';
import { withKeepAliveOverlay } from '@capital/component';
import React, { useState } from 'react';
import type { LocalUserChoices } from '@livekit/components-react';
import { PreJoinView } from './lib/PreJoinView';
import { LivekitContainer } from './LivekitContainer';
import { ActiveRoom } from './ActiveRoom';
import { useLivekitState } from '../store/useLivekitState';

interface LivekitViewProps {
  roomName: string;
  url: string;
}
const _LivekitView: React.FC<LivekitViewProps> = React.memo((props) => {
  const [preJoinChoices, setPreJoinChoices] = useState<
    LocalUserChoices | undefined
  >(undefined);
  const { setActive, setDeactive } = useLivekitState();

  const handleError = useEvent((err: Error) => {
    showErrorToasts('error while setting up prejoin');
    console.log('error while setting up prejoin', err);
  });

  const handleJoin = useEvent(async (userChoices: LocalUserChoices) => {
    await setDeactive(); // 先退出之前的房间

    setPreJoinChoices(userChoices);
    setActive(props.url);
  });

  const handleLeave = useEvent(() => {
    setPreJoinChoices(undefined);
    setDeactive();
  });

  return (
    <LivekitContainer>
      {props.roomName && preJoinChoices ? (
        <ActiveRoom
          roomName={props.roomName}
          userChoices={preJoinChoices}
          onLeave={handleLeave}
        />
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <PreJoinView
            roomName={props.roomName}
            onError={handleError}
            defaults={{
              videoEnabled: false,
              audioEnabled: false,
            }}
            onSubmit={handleJoin}
          />
        </div>
      )}
    </LivekitContainer>
  );
});
_LivekitView.displayName = 'LivekitView';

export const LivekitView = withKeepAliveOverlay(_LivekitView, {
  cacheId: (props) => props.url,
});
