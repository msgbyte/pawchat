import React from 'react';
import { t } from 'tailchat-shared';
import { FileCard, FileCardPayload } from './FileCard';
import { VideoCard, VideoCardPayload } from '@/components/Card/VideoCard';
import { CardWrapper } from './Wrapper';

interface Props {
  type: 'file';
  payload: FileCardPayload;
}
export const Card: React.FC<Props> = React.memo((props) => {
  if (props.type === 'file') {
    return <FileCard payload={props.payload} />;
  }
  if (props.type === 'video') {
    return <VideoCard payload={props.payload} />;
  }

  return <CardWrapper>{t('未知的卡片类型')}</CardWrapper>;
});
Card.displayName = 'Card';
