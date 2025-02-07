import { GroupPreview } from '@/components/GroupPreview';
import { NotFound } from '@/components/NotFound';
import React from 'react';
import { Route, Routes, useParams } from 'react-router';
import { t } from 'tailchat-shared';
import { MainProvider } from '../Main/Provider';

const PreviewRoute: React.FC = React.memo(() => {
  return (
    <MainProvider>
      <Routes>
        <Route path="/:groupId" element={<GroupPreviewRoute />} />

        <Route path="/*" element={t('未知的页面')} />
      </Routes>
    </MainProvider>
  );
});
PreviewRoute.displayName = 'PreviewRoute';

const GroupPreviewRoute: React.FC = React.memo(() => {
  const { groupId } = useParams<{
    groupId: string;
  }>();

  if (!groupId) {
    return <NotFound />;
  }

  return <GroupPreview groupId={groupId} />;
});
GroupPreviewRoute.displayName = 'GroupPreviewRoute';

export default PreviewRoute;
