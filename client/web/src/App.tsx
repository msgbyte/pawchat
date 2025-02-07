import React, { PropsWithChildren, Suspense, useEffect } from 'react';
import {
  BrowserRouter,
  HashRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import {
  getLanguage,
  parseUrlStr,
  sharedEvent,
  TcProvider,
  useAsync,
  useColorScheme,
  useGlobalConfigStore,
  useLanguage,
} from 'tailchat-shared';
import clsx from 'clsx';
import { Loadable } from './components/Loadable';
import { ConfigProvider as AntdProvider } from 'antd';
import { Helmet } from 'react-helmet';
import { useRecordMeasure } from './utils/measure-helper';
import { getPopupContainer, preventDefault } from './utils/dom-helper';
import { LoadingSpinner } from './components/LoadingSpinner';
import { pluginRootRoute } from './plugin/common';
import { PortalHost as FallbackPortalHost } from './components/Portal';
import isElectron from 'is-electron';
import { AppRouterApi } from './components/AppRouterApi';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ErrorBoundary } from './components/ErrorBoundary';
import enUS from 'antd/es/locale/en_US';
import type { Locale } from 'antd/es/locale-provider';
import { useInjectTianjiScript } from './hooks/useInjectTianjiScript';

const AppRouter: any = isElectron() ? HashRouter : BrowserRouter;

const MainRoute = Loadable(
  () =>
    import(
      /* webpackChunkName: 'main' */ /* webpackPreload: true */ './routes/Main'
    )
);

const EntryRoute = Loadable(
  () =>
    import(
      /* webpackChunkName: 'entry' */ /* webpackPreload: true */ './routes/Entry'
    )
);

const PanelRoute = Loadable(() => import('./routes/Panel'));

const InviteRoute = Loadable(
  () =>
    import(
      /* webpackChunkName: 'invite' */ /* webpackPreload: true */
      './routes/Invite'
    )
);

const PreviewRoute = Loadable(
  () =>
    import(
      /* webpackChunkName: 'preview' */ /* webpackPreload: true */
      './routes/Preview'
    )
);

export const TcAntdProvider: React.FC<PropsWithChildren> = React.memo(
  (props) => {
    const { value: locale } = useAsync(async (): Promise<Locale> => {
      const language = getLanguage();

      if (language === 'zh-CN') {
        return import('antd/es/locale/zh_CN').then((m) => m.default);
      }

      return enUS;
    }, []);

    return (
      <AntdProvider getPopupContainer={getPopupContainer} locale={locale}>
        {props.children}
      </AntdProvider>
    );
  }
);
TcAntdProvider.displayName = 'TcAntdProvider';

const AppProvider: React.FC<PropsWithChildren> = React.memo((props) => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AppRouter>
        <TcProvider>
          <DndProvider backend={HTML5Backend}>
            <TcAntdProvider>{props.children}</TcAntdProvider>
          </DndProvider>
        </TcProvider>
      </AppRouter>
    </Suspense>
  );
});
AppProvider.displayName = 'AppProvider';

const AppContainer: React.FC<PropsWithChildren> = React.memo((props) => {
  const { isDarkMode, extraSchemeName } = useColorScheme();

  return (
    <div
      id="tailchat-app"
      className={clsx(
        'tailchat-app',
        'absolute inset-0 select-none overflow-hidden',
        {
          dark: isDarkMode,
        },
        extraSchemeName
      )}
      onContextMenu={preventDefault}
    >
      {props.children}
    </div>
  );
});
AppContainer.displayName = 'AppContainer';

const AppHeader: React.FC = React.memo(() => {
  const { language } = useLanguage();
  const { serverName, serverEntryImage } = useGlobalConfigStore((state) => ({
    serverName: state.serverName,
    serverEntryImage: state.serverEntryImage,
  }));

  return (
    <Helmet>
      <meta httpEquiv="Content-Language" content={language} />
      <title>{serverName}</title>

      {serverEntryImage && (
        <style type="text/css">
          {`
              #tailchat-app {
                --tc-background-image: url(${parseUrlStr(serverEntryImage)});
              }
            `}
        </style>
      )}
    </Helmet>
  );
});
AppHeader.displayName = 'AppHeader';

export const App: React.FC = React.memo(() => {
  useRecordMeasure('appRenderStart');

  useInjectTianjiScript();

  useEffect(() => {
    sharedEvent.emit('appLoaded');
  }, []);

  return (
    <AppProvider>
      <AppHeader />
      <AppContainer>
        <AppRouterApi />
        <ErrorBoundary>
          <Routes>
            <Route
              path="/entry/*"
              element={
                <FallbackPortalHost>
                  <EntryRoute />
                </FallbackPortalHost>
              }
            />
            <Route path="/main/*" element={<MainRoute />} />
            <Route path="/panel/*" element={<PanelRoute />} />
            <Route path="/invite/:inviteCode" element={<InviteRoute />} />
            <Route path="/preview/*" element={<PreviewRoute />} />
            <Route
              path="/plugin/*"
              element={
                <FallbackPortalHost>
                  <Routes>
                    {pluginRootRoute.map((r, i) => (
                      <Route
                        key={r.name}
                        path={r.path ?? `/fallback${i}`}
                        element={React.createElement(r.component)}
                      />
                    ))}
                  </Routes>
                </FallbackPortalHost>
              }
            />

            <Route
              path="/*"
              element={<Navigate to="/entry" replace={true} />}
            />
          </Routes>
        </ErrorBoundary>
      </AppContainer>
    </AppProvider>
  );
});
App.displayName = 'App';
