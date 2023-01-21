import { request } from '../api/request';
import { buildCachedRequest } from '../cache/utils';
import { sharedEvent } from '../event';
import { SYSTEM_USERID } from '../utils/consts';
import { createAutoMergedRequest } from '../utils/request';
import _pick from 'lodash/pick';
import { t } from '../i18n';
import { parseUrlStr } from '../utils/url-helper';

export interface UserBaseInfo {
  _id: string;
  email: string;
  nickname: string;
  discriminator: string;
  avatar: string | null;
  temporary: boolean;
  extra?: Record<string, unknown>;
}

export interface UserLoginInfo extends UserBaseInfo {
  token: string;
  createdAt: string;
}

export interface UserSettings {
  /**
   * 消息列表虚拟化
   */
  messageListVirtualization?: boolean;

  /**
   * 其他的设置项
   */
  [key: string]: any;
}

export function pickUserBaseInfo(userInfo: UserLoginInfo) {
  return _pick(userInfo, [
    '_id',
    'email',
    'nickname',
    'discriminator',
    'avatar',
    'temporary',
  ]);
}

// 内置用户信息
const builtinUserInfo: Record<string, () => UserBaseInfo> = {
  [SYSTEM_USERID]: () => ({
    _id: SYSTEM_USERID,
    email: 'admin@msgbyte.com',
    nickname: t('系统'),
    discriminator: '0000',
    avatar: null,
    temporary: false,
  }),
};

/**
 * 用户私信列表
 */
export interface UserDMList {
  userId: string;
  converseIds: string[];
}

/**
 * 邮箱登录
 * @param email 邮箱
 * @param password 密码
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<UserLoginInfo> {
  const { data } = await request.post('/api/user/login', {
    email,
    password,
  });

  sharedEvent.emit('loginSuccess', pickUserBaseInfo(data));

  return data;
}

/**
 * 使用 Token 登录
 * @param token JWT令牌
 */
export async function loginWithToken(token: string): Promise<UserLoginInfo> {
  const { data } = await request.post('/api/user/resolveToken', {
    token,
  });

  sharedEvent.emit('loginSuccess', pickUserBaseInfo(data));

  return data;
}

/**
 * 发送邮箱校验码
 * @param email 邮箱
 */
export async function verifyEmail(email: string): Promise<UserLoginInfo> {
  const { data } = await request.post('/api/user/verifyEmail', {
    email,
  });

  return data;
}

/**
 * 邮箱注册账号
 * @param email 邮箱
 * @param password 密码
 */
export async function registerWithEmail(
  email: string,
  password: string,
  emailOTP?: string
): Promise<UserLoginInfo> {
  const { data } = await request.post('/api/user/register', {
    email,
    password,
    emailOTP,
  });

  return data;
}

/**
 * 修改密码
 */
export async function modifyUserPassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  await request.post('/api/user/modifyPassword', {
    oldPassword,
    newPassword,
  });
}

/**
 * 忘记密码
 * @param email 邮箱
 */
export async function forgetPassword(email: string) {
  await request.post('/api/user/forgetPassword', {
    email,
  });
}

/**
 * 忘记密码
 * @param email 邮箱
 */
export async function resetPassword(
  email: string,
  password: string,
  otp: string
) {
  await request.post('/api/user/resetPassword', {
    email,
    password,
    otp,
  });
}

/**
 * 创建访客账号
 * @param nickname 访客昵称
 */
export async function createTemporaryUser(
  nickname: string
): Promise<UserLoginInfo> {
  const { data } = await request.post('/api/user/createTemporaryUser', {
    nickname,
  });

  return data;
}

/**
 * 认领访客账号
 */
export async function claimTemporaryUser(
  userId: string,
  email: string,
  password: string,
  emailOTP?: string
): Promise<UserLoginInfo> {
  const { data } = await request.post('/api/user/claimTemporaryUser', {
    userId,
    email,
    password,
    emailOTP,
  });

  return data;
}

/**
 * 使用唯一标识名搜索用户
 * @param uniqueName 唯一标识用户昵称: 用户昵称#0000
 */
export async function searchUserWithUniqueName(
  uniqueName: string
): Promise<UserBaseInfo> {
  const { data } = await request.post('/api/user/searchUserWithUniqueName', {
    uniqueName,
  });

  return data;
}

const _fetchUserInfo = createAutoMergedRequest<string, UserBaseInfo>(
  async (userIds) => {
    // 这里用post是为了防止一次性获取的userId过多超过url限制
    const { data } = await request.post('/api/user/getUserInfoList', {
      userIds,
    });

    return data;
  }
);
/**
 * 获取用户基本信息
 * @param userId 用户ID
 */
export async function fetchUserInfo(userId: string): Promise<UserBaseInfo> {
  if (
    builtinUserInfo[userId] &&
    typeof builtinUserInfo[userId] === 'function'
  ) {
    return builtinUserInfo[userId]();
  }

  const userInfo = await _fetchUserInfo(userId);

  if (userInfo && userInfo.avatar) {
    userInfo.avatar = parseUrlStr(userInfo.avatar); // 用户信息从来源支持常量替换
  }

  return userInfo;
}

/**
 * 获取用户在线状态
 */
export async function getUserOnlineStatus(
  userIds: string[]
): Promise<boolean[]> {
  const { data } = await request.post<boolean[]>(
    '/api/gateway/checkUserOnline',
    {
      userIds,
    }
  );

  return data;
}

/**
 * 将会话添加到用户私信列表
 * 如果已添加则后端忽略
 */
export async function appendUserDMConverse(
  converseId: string
): Promise<UserDMList> {
  const { data } = await request.post<UserDMList>(
    '/api/user/dmlist/addConverse',
    {
      converseId,
    }
  );

  return data;
}

/**
 * 修改用户属性
 * @param fieldName 要修改的属性名
 * @param fieldValue 要修改的属性的值
 */
type AllowedModifyField = 'nickname' | 'avatar';
export async function modifyUserField(
  fieldName: AllowedModifyField,
  fieldValue: unknown
): Promise<UserBaseInfo> {
  const { data } = await request.post('/api/user/updateUserField', {
    fieldName,
    fieldValue,
  });

  return data;
}

export async function modifyUserExtra(
  fieldName: string,
  fieldValue: unknown
): Promise<UserBaseInfo> {
  const { data } = await request.post('/api/user/updateUserExtra', {
    fieldName,
    fieldValue,
  });

  return data;
}

/**
 * 获取用户设置
 */
export async function getUserSettings(): Promise<UserSettings> {
  const { data } = await request.get('/api/user/getUserSettings');

  return data;
}

/**
 * 设置用户设置
 */
export async function setUserSettings(
  settings: UserSettings
): Promise<UserSettings> {
  const { data } = await request.post('/api/user/setUserSettings', {
    settings,
  });

  return data;
}

/**
 * 检查Token是否可用
 */
export const checkTokenValid = buildCachedRequest(
  'tokenValid',
  async (token: string): Promise<boolean> => {
    const { data } = await request.post<boolean>('/api/user/checkTokenValid', {
      token,
    });

    return data;
  }
);
