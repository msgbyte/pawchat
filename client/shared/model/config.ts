import { request } from '../api/request';

/**
 * 后端的全局设置
 */
export interface GlobalConfig {
  /**
   * 上传文件体积
   * 默认1m
   */
  uploadFileLimit: number;
}

let globalConfig = {
  uploadFileLimit: 1 * 1024 * 1024,
  emailVerification: false, // 是否在注册时校验邮箱
};

export function getGlobalConfig() {
  return {
    ...globalConfig,
  };
}

export async function fetchGlobalClientConfig(): Promise<GlobalConfig> {
  const { data: config } = await request.get('/api/config/client');

  globalConfig = {
    ...globalConfig,
    ...config,
  };

  return config;
}
