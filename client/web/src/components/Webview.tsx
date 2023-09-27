import React, { useEffect, useMemo, useRef, useState } from 'react';
import { t , useDragstatus } from 'tailchat-shared';
import { withKeepAliveOverlay } from './KeepAliveOverlay';
import { Loading } from './Loading';



interface WebviewProps {
  className?: string;
  style?: React.CSSProperties;
  url: string;
}

/**
 * 网页渲染容器
 */
export const Webview: React.FC<WebviewProps> = (props) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [spinning, setSpinning] = useState(true);
  const status = useDragstatus()
  useEffect(() => {
    const callback = () => {
      setSpinning(false);
    };
    ref.current?.addEventListener('load', callback);
    return () => {
      ref.current?.removeEventListener('load', callback);
    };
  }, []);
  const pointerEvents =useMemo(()=>{
    return status ? 'none' : 'auto'
  },[status])

  return (
    <Loading
      spinning={spinning}
      className="w-full h-full"
      tip={t('加载网页中...')}
    >
      <iframe ref={ref} style={{pointerEvents}} className="w-full h-full" src={props.url} />
    </Loading>
  );
};
Webview.displayName = 'Webview';

/**
 * 带缓存的网页渲染容器
 * 用于需要在切换时依旧保持加载的case
 */
export const WebviewKeepAlive: React.FC<WebviewProps> =
  withKeepAliveOverlay<WebviewProps>(Webview, {
    cacheId: (props) => props.url,
  });
WebviewKeepAlive.displayName = 'WebviewKeepAlive';
