import { io, Socket } from 'socket.io-client';
import _isNil from 'lodash/isNil';
import { getServiceUrl } from '../manager/service';
import { isDevelopment } from '../utils/environment';
import { showErrorToasts, showGlobalLoading, showToasts } from '../manager/ui';
import { t } from '../i18n';
import { sharedEvent } from '../event';
import msgpackParser from 'socket.io-msgpack-parser';
import { getGlobalConfig } from '../model/config';

class SocketEventError extends Error {
  name = 'SocketEventError';
}

type SocketEventRespones<T = unknown> =
  | {
      result: true;
      data: T;
    }
  | {
      result: false;
      message: string;
    };

/**
 * 封装后的 Socket
 */
export class AppSocket {
  private listener: [string, (data: unknown) => void][] = [];

  constructor(private socket: Socket) {
    socket.onAny((eventName: string, data: unknown) => {
      const matched = this.listener.filter(([ev]) => ev === eventName); // 匹配到的监听器列表
      if (matched.length === 0) {
        // 没有匹配到任何处理函数
        console.warn(`[Socket IO] Unhandler event: ${eventName}`, data);
        return;
      }

      matched.forEach(([, cb]) => {
        cb(data);
      });
    });
  }

  get connected(): boolean {
    return this.socket.connected;
  }

  async request<T = unknown>(
    eventName: string,
    eventData: unknown = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.socket.emit(eventName, eventData, (resp: SocketEventRespones<T>) => {
        if (resp.result === true) {
          resolve(resp.data);
        } else if (resp.result === false) {
          const error = new SocketEventError(
            `[${eventName}]: ${resp.message}: \ndata: ${JSON.stringify(
              eventData
            )}`
          );
          console.error(error);
          reject(error);
        }
      });
    });
  }

  /**
   * 监听远程通知
   */
  listen<T>(eventName: string, callback: (data: T) => void) {
    this.listener.push([`notify:${eventName}`, callback as any]);
  }

  /**
   * 移除监听函数
   */
  removeListener(eventName: string, callback: (data: any) => void) {
    const index = this.listener.findIndex(
      (item) => item[0] === `notify:${eventName}` && item[1] === callback
    );
    if (index >= 0) {
      this.listener.splice(index, 1);
    }
  }

  /**
   * 模拟重连
   * NOTICE: 仅用于开发环境
   */
  mockReconnect() {
    this.socket.disconnect();
    showToasts('reconnect after 5s');
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.socket.io.skipReconnect = false;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.socket.io.reconnect();
    }, 5 * 1000);
  }

  /**
   * 断线重连后触发
   */
  onReconnect(cb: () => void) {
    this.socket.io.on('reconnect', cb);
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.socket.disconnect();
  }

  /**
   * 初始Socket状态管理提示
   */
  private closeFn: unknown = null; // 全局loading关闭函数
  setupSocketStatusTip() {
    const socket = this.socket;

    const showConnecting = () => {
      if (this.closeFn) {
        return;
      }
      this.closeFn = showGlobalLoading(t('正在重新链接'));
    };

    const closeConnecting = () => {
      if (this.closeFn && typeof this.closeFn === 'function') {
        this.closeFn();
        this.closeFn = null;
      }
    };

    // 网络状态管理
    socket.on('connect', () => {
      console.log('连接成功');
      closeConnecting();

      sharedEvent.emit('updateNetworkStatus', 'connected');
    });
    socket.on('connecting', (data) => {
      console.log('正在连接');

      showConnecting();

      sharedEvent.emit('updateNetworkStatus', 'reconnecting');
    });
    socket.on('disconnect', (data) => {
      console.log('与服务器的链接已断开');
      showErrorToasts(t('与服务器的链接已断开'));
      closeConnecting();
      sharedEvent.emit('updateNetworkStatus', 'disconnected');
    });
    socket.on('connect_error', (data) => {
      console.log('连接失败');
      showErrorToasts(t('连接失败'));
      closeConnecting();
      sharedEvent.emit('updateNetworkStatus', 'disconnected');
    });

    socket.io.on('reconnect', (data) => {
      console.log('重连成功');

      closeConnecting();
      sharedEvent.emit('updateNetworkStatus', 'connected');
    });
    socket.io.on('reconnect_attempt', (data) => {
      console.log('重连中...');
      showConnecting();
      sharedEvent.emit('updateNetworkStatus', 'reconnecting');
    });
    socket.io.on('reconnect_error', (error) => {
      console.error('重连尝试失败...', error);
      showConnecting();
      sharedEvent.emit('updateNetworkStatus', 'reconnecting');
    });
    socket.io.on('reconnect_failed', () => {
      console.error('重连失败...');
      showConnecting();
      sharedEvent.emit('updateNetworkStatus', 'disconnected');
    });
    socket.io.on('error', (error) => {
      console.error('网络出现异常', error);
      showErrorToasts(t('网络出现异常'));
      closeConnecting();
      sharedEvent.emit('updateNetworkStatus', 'disconnected');
    });
  }
}

let _socket: Socket;
/**
 * 创建Socket连接
 * 如果已经有Socket连接则关闭上一个
 * @param token Token
 */
export function createSocket(token: string): Promise<AppSocket> {
  if (!_isNil(_socket)) {
    _socket.close();
  }

  return new Promise((resolve, reject) => {
    const disableMsgpack = getGlobalConfig().disableMsgpack;
    _socket = io(getServiceUrl(), {
      transports: ['websocket'],
      auth: {
        token,
      },
      forceNew: true,
      parser: disableMsgpack ? undefined : msgpackParser,
    });
    _socket.once('connect', () => {
      // 连接成功
      const appSocket = new AppSocket(_socket);
      appSocket.setupSocketStatusTip();
      resolve(appSocket);
    });
    _socket.once('error', () => {
      reject();
    });

    if (isDevelopment) {
      _socket.onAny((...args) => {
        console.debug('Receive Notify:', args);
      });
    }
  });
}
