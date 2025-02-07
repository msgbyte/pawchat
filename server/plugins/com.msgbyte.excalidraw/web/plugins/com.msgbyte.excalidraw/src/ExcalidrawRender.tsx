import React from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';

export const ExcalidrawRender: React.FC = React.memo(() => {
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Excalidraw initialData={{ elements: [] }} />
    </div>
  );
});
ExcalidrawRender.displayName = 'ExcalidrawRender';
