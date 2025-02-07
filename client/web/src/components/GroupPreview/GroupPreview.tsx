import React from 'react';
import { useSocket } from './useSocket';

/**
 * A Component for Group Preview Entry
 */
export const GroupPreview: React.FC<{
  groupId: string;
}> = React.memo((props) => {
  useSocket(props.groupId);

  return null;
});
GroupPreview.displayName = 'GroupPreview';
