import _ from 'lodash';
import { Types } from 'mongoose';
import { isValidStr } from '../../../lib/utils';
import type {
  Group,
  GroupDocument,
  GroupModel,
  GroupPanel,
} from '../../../models/group/group';
import {
  TcService,
  GroupBaseInfo,
  TcContext,
  TcDbService,
  PureContext,
  call,
  DataNotFoundError,
  EntityError,
  NoPermissionError,
  PERMISSION,
  GroupPanelType,
  PanelFeature,
  config,
  SYSTEM_USERID,
  db,
} from 'tailchat-server-sdk';
import moment from 'moment';
import type { GroupStruct } from 'tailchat-server-sdk';

interface GroupService
  extends TcService,
    TcDbService<GroupDocument, GroupModel> {}
class GroupService extends TcService {
  get serviceName(): string {
    return 'group';
  }

  onInit(): void {
    this.registerLocalDb(require('../../../models/group/group').default);

    this.registerAction('createGroup', this.createGroup, {
      params: {
        name: 'string',
        panels: 'array',
      },
    });
    this.registerAction('getUserGroups', this.getUserGroups);
    this.registerAction(
      'getJoinedGroupAndPanelIds',
      this.getJoinedGroupAndPanelIds
    );
    this.registerAction('getGroupSocketRooms', this.getGroupSocketRooms);
    this.registerAction('getGroupBasicInfo', this.getGroupBasicInfo, {
      params: {
        groupId: 'string',
      },
      cache: {
        keys: ['groupId'],
        ttl: 60 * 60, // 1 hour
      },
    });
    this.registerAction('getGroupInfo', this.getGroupInfo, {
      params: {
        groupId: 'string',
      },
      cache: {
        keys: ['groupId'],
        ttl: 60 * 60, // 1 hour
      },
      visibility: 'public',
    });
    this.registerAction('updateGroupField', this.updateGroupField, {
      params: {
        groupId: 'string',
        fieldName: 'string',
        fieldValue: 'any',
      },
    });
    this.registerAction('updateGroupConfig', this.updateGroupConfig, {
      params: {
        groupId: 'string',
        configName: 'string',
        configValue: 'any',
      },
    });
    this.registerAction('isGroupOwner', this.isGroupOwner, {
      params: {
        groupId: 'string',
      },
    });
    this.registerAction('addMember', this.addMember, {
      params: {
        groupId: 'string',
        userId: 'string',
      },
      visibility: 'public',
    });
    /**
     * 加入群组
     * @deprecated 请尽量使用 addMember
     */
    this.registerAction('joinGroup', this.joinGroup, {
      params: {
        groupId: 'string',
      },
      visibility: 'public',
    });
    this.registerAction('quitGroup', this.quitGroup, {
      params: {
        groupId: 'string',
      },
    });
    this.registerAction('isMember', this.isMember, {
      params: {
        groupId: 'string',
      },
    });
    this.registerAction('appendGroupMemberRoles', this.appendGroupMemberRoles, {
      params: {
        groupId: 'string',
        memberIds: { type: 'array', items: 'string' },
        roles: { type: 'array', items: 'string' },
      },
    });
    this.registerAction('removeGroupMemberRoles', this.removeGroupMemberRoles, {
      params: {
        groupId: 'string',
        memberIds: { type: 'array', items: 'string' },
        roles: { type: 'array', items: 'string' },
      },
    });
    this.registerAction('createGroupPanel', this.createGroupPanel, {
      params: {
        groupId: 'string',
        name: 'string',
        type: 'number',
        parentId: { type: 'string', optional: true },
        provider: { type: 'string', optional: true },
        pluginPanelName: { type: 'string', optional: true },
        meta: { type: 'object', optional: true },
      },
    });
    this.registerAction('modifyGroupPanel', this.modifyGroupPanel, {
      params: {
        groupId: 'string',
        panelId: 'string',
        name: 'string',
        type: 'number',
        provider: { type: 'string', optional: true },
        pluginPanelName: { type: 'string', optional: true },
        meta: { type: 'object', optional: true },
        permissionMap: { type: 'object', optional: true },
        fallbackPermissions: { type: 'array', items: 'string', optional: true },
      },
    });
    this.registerAction('deleteGroupPanel', this.deleteGroupPanel, {
      params: {
        groupId: 'string',
        panelId: 'string',
      },
    });
    this.registerAction(
      'getGroupLobbyConverseId',
      this.getGroupLobbyConverseId,
      {
        params: {
          groupId: 'string',
        },
      }
    );
    this.registerAction('createGroupRole', this.createGroupRole, {
      params: {
        groupId: 'string',
        roleName: 'string',
        permissions: { type: 'array', items: 'string' },
      },
    });
    this.registerAction('deleteGroupRole', this.deleteGroupRole, {
      params: {
        groupId: 'string',
        roleId: 'string',
      },
    });
    this.registerAction('updateGroupRoleName', this.updateGroupRoleName, {
      params: {
        groupId: 'string',
        roleId: 'string',
        roleName: 'string',
      },
    });
    this.registerAction(
      'updateGroupRolePermission',
      this.updateGroupRolePermission,
      {
        params: {
          groupId: 'string',
          roleId: 'string',
          permissions: {
            type: 'array',
            items: 'string',
          },
        },
      }
    );
    this.registerAction('getPermissions', this.getPermissions, {
      params: {
        groupId: 'string',
      },
    });
    this.registerAction('getUserAllPermissions', this.getUserAllPermissions, {
      params: {
        groupId: 'string',
        userId: 'string',
      },
      visibility: 'public',
      cache: {
        keys: ['groupId', 'userId'],
        ttl: 60 * 60, // 1 hour
      },
    });
    this.registerAction('muteGroupMember', this.muteGroupMember, {
      params: {
        groupId: 'string',
        memberId: 'string',
        muteMs: 'number',
      },
    });
    this.registerAction('deleteGroupMember', this.deleteGroupMember, {
      params: {
        groupId: 'string',
        memberId: 'string',
      },
    });
  }

  /**
   * 获取会被订阅的群组面板id列表
   *
   * 订阅即加入socket房间
   */
  private getSubscribedGroupPanelIds(group: GroupStruct): {
    textPanelIds: string[];
    subscribeFeaturePanelIds: string[];
  } {
    const textPanelIds = this.getGroupTextPanelIds(group);
    const subscribeFeaturePanelIds = this.getGroupPanelIdsWithFeature(
      group,
      'subscribe'
    );

    return {
      textPanelIds,
      subscribeFeaturePanelIds,
    };
  }

  /**
   * 获取群组所有的文字面板id列表
   * 用于加入房间
   */
  private getGroupTextPanelIds(group: GroupStruct): string[] {
    // TODO: 先无视权限, 把所有的信息全部显示
    const textPanelIds = group.panels
      .filter((p) => p.type === GroupPanelType.TEXT)
      .map((p) => p.id);

    return textPanelIds;
  }

  /**
   * 获取群组中拥有某些特性的面板
   * @param group
   */
  private getGroupPanelIdsWithFeature(
    group: GroupStruct,
    feature: PanelFeature
  ): string[] {
    const featureAllPanelNames = this.getPanelNamesWithFeature(feature);
    const matchedPanels = group.panels.filter((p) =>
      featureAllPanelNames.includes(p.pluginPanelName)
    );

    return matchedPanels.map((p) => p.id);
  }

  /**
   * 创建群组
   */
  async createGroup(
    ctx: TcContext<{
      name: string;
      panels: GroupPanel[];
    }>
  ) {
    const name = ctx.params.name;
    const panels = ctx.params.panels;
    const userId = ctx.meta.userId;
    const t = ctx.meta.t;

    if (
      config.feature.disableCreateGroup === true &&
      userId !== SYSTEM_USERID
    ) {
      // 环境变量禁止创建群组
      throw new NoPermissionError(t('创建群组功能已被管理员禁用'));
    }

    const doc = await this.adapter.model.createGroup({
      name,
      panels,
      owner: userId,
    });

    const group = await this.transformDocuments(ctx, {}, doc);

    const { textPanelIds, subscribeFeaturePanelIds } =
      this.getSubscribedGroupPanelIds(group);

    await call(ctx).joinSocketIORoom(
      [String(group._id), ...textPanelIds, ...subscribeFeaturePanelIds],
      userId
    );

    return group;
  }

  async getUserGroups(ctx: TcContext): Promise<GroupStruct[]> {
    const userId = ctx.meta.userId;

    const groups = await this.adapter.model.getUserGroups(userId);

    return this.transformDocuments(ctx, {}, groups);
  }

  /**
   * 获取用户所有加入群组的群组id列表与聊天会话id列表
   */
  async getJoinedGroupAndPanelIds(ctx: TcContext): Promise<{
    groupIds: string[];
    textPanelIds: string[];
    subscribeFeaturePanelIds: string[];
  }> {
    const groups = await this.getUserGroups(ctx); // TODO: 应该使用call而不是直接调用，为了获取tracer和caching支持。目前moleculer的文档没有显式的声明类似localCall的行为，可以花时间看一下
    const textPanelIds = _.flatten(
      groups.map((g) => this.getSubscribedGroupPanelIds(g).textPanelIds)
    );
    const subscribeFeaturePanelIds = _.flatten(
      groups.map(
        (g) => this.getSubscribedGroupPanelIds(g).subscribeFeaturePanelIds
      )
    );

    return {
      groupIds: groups.map((g) => String(g._id)),
      textPanelIds,
      subscribeFeaturePanelIds,
    };
  }

  /**
   * 获取所有订阅的群组面板列表
   */
  async getGroupSocketRooms(ctx: TcContext<{ groupId: string }>): Promise<{
    textPanelIds: string[];
    subscribeFeaturePanelIds: string[];
  }> {
    const groupId = ctx.params.groupId;

    const group = await call(ctx).getGroupInfo(groupId);

    return this.getSubscribedGroupPanelIds(group);
  }

  /**
   * 获取群组基本信息
   */
  async getGroupBasicInfo(
    ctx: PureContext<{
      groupId: string;
    }>
  ): Promise<GroupBaseInfo> {
    const group = await this.adapter.model
      .findById(ctx.params.groupId, {
        name: 1,
        avatar: 1,
        owner: 1,
        description: 1,
        members: 1,
        config: 1,
      })
      .exec();

    if (group === null) {
      return null;
    }

    const groupMemberCount = group.members.length;
    const backgroundImage = group.config['groupBackgroundImage'];

    return {
      name: group.name,
      avatar: group.avatar,
      owner: String(group.owner),
      description: group.description ?? '',
      memberCount: groupMemberCount,
      backgroundImage: backgroundImage,
    };
  }

  /**
   * 获取群组完整信息
   * 仅内部可以访问
   */
  async getGroupInfo(ctx: TcContext<{ groupId: string }>): Promise<Group> {
    const groupInfo = await this.adapter.model.findById(ctx.params.groupId);

    return await this.transformDocuments(ctx, {}, groupInfo);
  }

  /**
   * 修改群组字段
   */
  async updateGroupField(
    ctx: TcContext<{
      groupId: string;
      fieldName: string;
      fieldValue: unknown;
    }>
  ) {
    const { groupId, fieldName, fieldValue } = ctx.params;
    const userId = ctx.meta.userId;
    const t = ctx.meta.t;
    if (
      ![
        'name',
        'avatar',
        'description',
        'panels',
        'roles',
        'fallbackPermissions',
      ].includes(fieldName)
    ) {
      throw new EntityError(t('该数据不允许修改'));
    }

    const [
      isGroupOwner,
      hasBaseInfoPermission,
      hasRolePermission,
      hasManagePanelPermission,
    ] = await call(ctx).checkUserPermissions(groupId, userId, [
      PERMISSION.core.owner,
      PERMISSION.core.groupBaseInfo,
      PERMISSION.core.manageRoles,
      PERMISSION.core.managePanel,
    ]);

    if (['roles', 'fallbackPermissions'].includes(fieldName)) {
      if (!hasRolePermission) {
        throw new NoPermissionError(t('没有编辑群组身份组权限'));
      }
    } else if (['name', 'avatar', 'description'].includes(fieldName)) {
      if (!hasBaseInfoPermission) {
        throw new NoPermissionError(t('没有编辑群组信息权限'));
      }
    } else if (fieldName === 'panels') {
      if (!hasManagePanelPermission) {
        throw new NoPermissionError(t('没有编辑群组面板权限'));
      }
    } else if (!isGroupOwner) {
      throw new NoPermissionError(t('不是群组所有者无法编辑'));
    }

    const group = await this.adapter.model.findById(groupId).exec();

    group[fieldName] = fieldValue;
    await group.save();

    if (fieldName === 'fallbackPermissions') {
      await this.cleanGroupAllUserPermissionCache(groupId);
    }

    this.notifyGroupInfoUpdate(ctx, group);
  }

  /**
   * 修改群组配置
   */
  async updateGroupConfig(
    ctx: TcContext<{
      groupId: string;
      configName: string;
      configValue: unknown;
    }>
  ) {
    const { groupId, configName, configValue } = ctx.params;
    const userId = ctx.meta.userId;
    const t = ctx.meta.t;

    const [hasPermission] = await call(ctx).checkUserPermissions(
      groupId,
      userId,
      [PERMISSION.core.groupConfig]
    );

    if (!hasPermission) {
      throw new NoPermissionError(t('没有操作权限'));
    }

    const group = await this.adapter.model.findOneAndUpdate(
      {
        _id: String(groupId),
      },
      {
        $set: {
          [`config.${configName}`]: configValue,
        },
      },
      {
        new: true,
      }
    );

    this.notifyGroupInfoUpdate(ctx, group);
  }

  /**
   * 检测用户是否为群组所有者
   */
  async isGroupOwner(
    ctx: TcContext<{
      groupId: string;
    }>
  ): Promise<boolean> {
    const t = ctx.meta.t;
    const group = await this.adapter.model.findById(ctx.params.groupId);
    if (!group) {
      throw new DataNotFoundError(t('没有找到群组'));
    }

    return String(group.owner) === ctx.meta.userId;
  }

  /**
   * 群组添加成员
   */
  async addMember(
    ctx: TcContext<{
      groupId: string;
      userId: string;
    }>
  ) {
    const { groupId, userId } = ctx.params;

    if (!isValidStr(userId)) {
      throw new EntityError('用户id为空');
    }

    if (!isValidStr(groupId)) {
      throw new EntityError('群组id为空');
    }

    const { members } = await this.adapter.model.findById(groupId, {
      members: 1,
    });
    if (members.findIndex((m) => String(m.userId) === userId) >= 0) {
      throw new Error('已加入该群组');
    }

    const doc = await this.adapter.model
      .findByIdAndUpdate(
        groupId,
        {
          $addToSet: {
            members: {
              userId: new Types.ObjectId(userId),
            },
          },
        },
        {
          new: true,
        }
      )
      .exec();

    const group: GroupStruct = await this.transformDocuments(ctx, {}, doc);

    this.notifyGroupInfoUpdate(ctx, group); // 推送变更
    this.unicastNotify(ctx, userId, 'add', group);

    const { textPanelIds, subscribeFeaturePanelIds } =
      this.getSubscribedGroupPanelIds(group);

    await call(ctx).joinSocketIORoom(
      [String(group._id), ...textPanelIds, ...subscribeFeaturePanelIds],
      userId
    );

    return group;
  }

  /**
   * 加入群组
   * @deprecated 请尽量使用 addMember
   */
  async joinGroup(
    ctx: TcContext<{
      groupId: string;
    }>
  ) {
    const groupId = ctx.params.groupId;
    const userId = ctx.meta.userId;

    return this.localCall('addMember', {
      groupId,
      userId,
    });
  }

  /**
   * 退出群组
   */
  async quitGroup(
    ctx: TcContext<{
      groupId: string;
    }>
  ) {
    const groupId = ctx.params.groupId;
    const userId = ctx.meta.userId;

    const group = await this.adapter.findById(groupId);
    if (String(group.owner) === userId) {
      // 是群组所有人
      await this.adapter.removeById(groupId); // TODO: 后续可以考虑改为软删除
      await this.roomcastNotify(ctx, groupId, 'remove', { groupId });
      await ctx.call('gateway.leaveRoom', {
        roomIds: [groupId],
      });
    } else {
      // 是普通群组成员
      const doc = await this.adapter.model
        .findByIdAndUpdate(
          groupId,
          {
            $pull: {
              members: {
                userId: new Types.ObjectId(userId),
              },
            },
          },
          {
            new: true,
          }
        )
        .exec();

      const group: Group = await this.transformDocuments(ctx, {}, doc);

      await this.memberLeaveGroup(ctx, group, userId);
    }
  }

  /**
   * 检查是否为群组成员
   */
  async isMember(ctx: TcContext<{ groupId: string }>) {
    const groupId = ctx.params.groupId;
    const userId = ctx.meta.userId;

    const groupInfo = await call(ctx).getGroupInfo(groupId);
    if (!groupInfo) {
      // 没有找到群组信息
      return false;
    }

    const members = groupInfo.members;

    return members.some((m) => String(m.userId) === userId);
  }

  /**
   * 追加群组成员的角色
   */
  async appendGroupMemberRoles(
    ctx: TcContext<{
      groupId: string;
      memberIds: string[];
      roles: string[];
    }>
  ) {
    const { groupId, memberIds, roles } = ctx.params;

    await this.adapter.model.checkGroupFieldPermission(ctx, groupId, 'roles');

    // 更新内容
    await this.adapter.model.updateMany(
      {
        _id: new db.Types.ObjectId(groupId),
        'members.userId': {
          $in: [...memberIds],
        },
      },
      {
        $addToSet: {
          'members.$[elem].roles': {
            $each: roles,
          },
        },
      },
      { arrayFilters: [{ 'elem.userId': { $in: [...memberIds] } }] }
    );

    const group = await this.adapter.model.findById(groupId);

    await this.notifyGroupInfoUpdate(ctx, group);
    await Promise.all(
      memberIds.map((memberId) =>
        this.cleanGroupUserPermission(groupId, memberId)
      )
    );
  }

  /**
   * 移除群组成员的角色
   */
  async removeGroupMemberRoles(
    ctx: TcContext<{
      groupId: string;
      memberIds: string[];
      roles: string[];
    }>
  ) {
    const { groupId, memberIds, roles } = ctx.params;

    await this.adapter.model.checkGroupFieldPermission(ctx, groupId, 'roles');

    // 更新内容
    await this.adapter.model.updateMany(
      {
        _id: new db.Types.ObjectId(groupId),
        'members.userId': {
          $in: [...memberIds],
        },
      },
      {
        $pull: {
          'members.$[elem].roles': {
            $in: roles,
          },
        },
      },
      { arrayFilters: [{ 'elem.userId': { $in: [...memberIds] } }] }
    );

    const group = await this.adapter.model.findById(groupId);

    await this.notifyGroupInfoUpdate(ctx, group);
    await Promise.all(
      memberIds.map((memberId) =>
        this.cleanGroupUserPermission(groupId, memberId)
      )
    );
  }

  /**
   * 创建群组面板
   */
  async createGroupPanel(
    ctx: TcContext<{
      groupId: string;
      name: string;
      type: number;
      parentId?: string;
      provider?: string;
      pluginPanelName?: string;
      meta?: object;
    }>
  ) {
    const { groupId, name, type, parentId, provider, pluginPanelName, meta } =
      ctx.params;
    const { t, userId } = ctx.meta;

    const [hasPermission] = await call(ctx).checkUserPermissions(
      groupId,
      userId,
      [PERMISSION.core.managePanel]
    );

    if (!hasPermission) {
      throw new NoPermissionError(t('没有操作权限'));
    }

    const panelId = String(new Types.ObjectId());

    const group = await this.adapter.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(groupId),
        },
        {
          $push: {
            panels: {
              id: panelId,
              name,
              type,
              parentId,
              provider,
              pluginPanelName,
              meta,
            },
          },
        },
        {
          new: true,
        }
      )
      .exec();

    if (
      type === GroupPanelType.TEXT ||
      this.getPanelNamesWithFeature('subscribe').includes(name)
    ) {
      /**
       * 如果为订阅的面板
       * 则所有群组成员加入房间
       */
      const groupInfo = await call(ctx).getGroupInfo(groupId);
      (groupInfo?.members ?? []).map((m) =>
        call(ctx).joinSocketIORoom([panelId], m.userId)
      );
    }

    this.notifyGroupInfoUpdate(ctx, group);
  }

  /**
   * 修改群组面板
   */
  async modifyGroupPanel(
    ctx: TcContext<{
      groupId: string;
      panelId: string;
      name: string;
      type: number;
      provider?: string;
      pluginPanelName?: string;
      meta?: object;
      permissionMap?: object;
      fallbackPermissions?: string[];
    }>
  ) {
    const {
      groupId,
      panelId,
      name,
      type,
      provider,
      pluginPanelName,
      meta,
      permissionMap,
      fallbackPermissions,
    } = ctx.params;
    const { t, userId } = ctx.meta;

    const [hasPermission] = await call(ctx).checkUserPermissions(
      groupId,
      userId,
      [PERMISSION.core.managePanel]
    );
    if (!hasPermission) {
      throw new NoPermissionError(t('没有操作权限'));
    }

    const res = await this.adapter.model
      .updateOne(
        {
          _id: new Types.ObjectId(groupId),
        },
        {
          $set: {
            'panels.$[element].name': name,
            'panels.$[element].type': type,
            'panels.$[element].provider': provider,
            'panels.$[element].pluginPanelName': pluginPanelName,
            'panels.$[element].meta': meta,
            'panels.$[element].permissionMap': permissionMap,
            'panels.$[element].fallbackPermissions': fallbackPermissions,
          },
        },
        {
          new: true,
          arrayFilters: [{ 'element.id': panelId }],
        }
      )
      .exec();

    if (res.modifiedCount === 0) {
      throw new Error(t('没有找到该面板'));
    }

    const group = await this.adapter.model.findById(String(groupId));

    const json = await this.notifyGroupInfoUpdate(ctx, group);
    return json;
  }

  /**
   * 删除群组面板
   */
  async deleteGroupPanel(ctx: TcContext<{ groupId: string; panelId: string }>) {
    const { groupId, panelId } = ctx.params;
    const { t, userId } = ctx.meta;

    const [hasPermission] = await call(ctx).checkUserPermissions(
      groupId,
      userId,
      [PERMISSION.core.managePanel]
    );
    if (!hasPermission) {
      throw new NoPermissionError(t('没有操作权限'));
    }

    const group = await this.adapter.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(groupId),
        },
        {
          $pull: {
            panels: {
              $or: [
                {
                  id: new Types.ObjectId(panelId),
                },
                {
                  parentId: new Types.ObjectId(panelId),
                },
              ],
            } as any,
          },
        },
        {
          new: true,
        }
      )
      .exec();

    const json = await this.notifyGroupInfoUpdate(ctx, group);
    return json;
  }

  /**
   * 获取群组大厅的会话ID()
   */
  async getGroupLobbyConverseId(ctx: TcContext<{ groupId: string }>) {
    const groupId = ctx.params.groupId;
    const t = ctx.meta.t;

    const group = await this.adapter.model.findById(groupId);
    if (!group) {
      throw new DataNotFoundError(t('群组未找到'));
    }

    const firstTextPanel = group.panels.find(
      (panel) => panel.type === GroupPanelType.TEXT
    );

    if (!firstTextPanel) {
      return null;
    }

    return firstTextPanel.id;
  }

  /**
   * 创建群组角色
   */
  async createGroupRole(
    ctx: TcContext<{ groupId: string; roleName: string; permissions: string[] }>
  ) {
    const { groupId, roleName, permissions } = ctx.params;
    const { userId, t } = ctx.meta;

    const [hasPermission] = await call(ctx).checkUserPermissions(
      groupId,
      userId,
      [PERMISSION.core.managePanel]
    );
    if (!hasPermission) {
      throw new NoPermissionError(t('没有操作权限'));
    }

    const group = await this.adapter.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(groupId),
        },
        {
          $push: {
            roles: {
              name: roleName,
              permissions,
            },
          },
        },
        {
          new: true,
        }
      )
      .exec();

    this.cleanGroupInfoCache(groupId);
    const json = await this.notifyGroupInfoUpdate(ctx, group);
    return json;
  }

  /**
   * 删除群组角色
   */
  async deleteGroupRole(ctx: TcContext<{ groupId: string; roleId: string }>) {
    const { groupId, roleId } = ctx.params;
    const { userId, t } = ctx.meta;

    const [hasPermission] = await call(ctx).checkUserPermissions(
      groupId,
      userId,
      [PERMISSION.core.manageRoles]
    );
    if (!hasPermission) {
      throw new NoPermissionError(t('没有操作权限'));
    }

    const group = await this.adapter.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(groupId),
        },
        {
          $pull: {
            roles: {
              _id: roleId,
            }, // 删除角色
            'members.$[].roles': roleId, // 删除成员角色
          },
        },
        {
          new: true,
        }
      )
      .exec();

    this.cleanGroupInfoCache(groupId);
    const json = await this.notifyGroupInfoUpdate(ctx, group);
    return json;
  }

  /**
   * 更新群组角色权限
   */
  async updateGroupRoleName(
    ctx: TcContext<{
      groupId: string;
      roleId: string;
      roleName: string;
    }>
  ) {
    const { groupId, roleId, roleName } = ctx.params;
    const { userId, t } = ctx.meta;

    const [hasPermission] = await call(ctx).checkUserPermissions(
      groupId,
      userId,
      [PERMISSION.core.managePanel]
    );
    if (!hasPermission) {
      throw new NoPermissionError(t('没有操作权限'));
    }

    const group = await this.adapter.model.updateGroupRoleName(
      groupId,
      roleId,
      roleName
    );

    this.cleanGroupInfoCache(groupId);
    const json = await this.notifyGroupInfoUpdate(ctx, group);
    return json;
  }

  /**
   * 更新群组角色权限
   */
  async updateGroupRolePermission(
    ctx: TcContext<{
      groupId: string;
      roleId: string;
      permissions: string[];
    }>
  ) {
    const { groupId, roleId, permissions } = ctx.params;
    const { userId, t } = ctx.meta;

    const [hasPermission] = await call(ctx).checkUserPermissions(
      groupId,
      userId,
      [PERMISSION.core.managePanel]
    );
    if (!hasPermission) {
      throw new NoPermissionError(t('没有操作权限'));
    }

    const group = await this.adapter.model.updateGroupRolePermission(
      groupId,
      roleId,
      permissions
    );

    this.cleanGroupInfoCache(groupId);
    this.cleanGroupAllUserPermissionCache(groupId);
    const json = await this.notifyGroupInfoUpdate(ctx, group);
    return json;
  }

  /**
   * 获取群组成员权限(对外)
   */
  async getPermissions(
    ctx: TcContext<{
      groupId: string;
    }>
  ): Promise<string[]> {
    const { groupId } = ctx.params;
    const userId = ctx.meta.userId;

    const permissions = await this.localCall('getUserAllPermissions', {
      groupId,
      userId,
    });

    return permissions;
  }

  /**
   * 获取群组成员权限(对内)
   * 带有groupId和userId的缓存
   */
  async getUserAllPermissions(
    ctx: TcContext<{
      groupId: string;
      userId: string;
    }>
  ): Promise<string[]> {
    const { groupId, userId } = ctx.params;
    const permissions = await this.adapter.model.getGroupUserPermission(
      groupId,
      userId
    );

    return permissions;
  }

  /**
   * 禁言群组成员
   */
  async muteGroupMember(
    ctx: TcContext<{
      groupId: string;
      memberId: string;
      muteMs: number; // 禁言多少多少毫秒. 精确到ms, 如果小于0则视为解除禁言
    }>
  ) {
    const { groupId, memberId, muteMs } = ctx.params;
    const language = ctx.meta.language;
    const isUnmute = muteMs < 0;

    const group = await this.adapter.model.updateGroupMemberField(
      ctx,
      groupId,
      memberId,
      'muteUntil',
      isUnmute ? undefined : new Date(new Date().valueOf() + muteMs)
    );

    this.notifyGroupInfoUpdate(ctx, group);

    const memberInfo = await call(ctx).getUserInfo(memberId);
    if (isUnmute) {
      await call(ctx).addGroupSystemMessage(
        groupId,
        `${ctx.meta.user.nickname} 解除了 ${memberInfo.nickname} 的禁言`
      );
    } else {
      await call(ctx).addGroupSystemMessage(
        groupId,
        `${ctx.meta.user.nickname} 禁言了 ${memberInfo.nickname} ${moment
          .duration(muteMs, 'ms')
          .locale(language)
          .humanize()}`
      );
    }
  }

  async deleteGroupMember(
    ctx: TcContext<{
      groupId: string;
      memberId: string;
    }>
  ) {
    const { groupId, memberId } = ctx.params;
    const userId = ctx.meta.userId;
    const t = ctx.meta.t;

    // 检查是否在踢自己
    if (String(memberId) === String(userId)) {
      throw new Error(t('不允许踢出自己'));
    }

    // 检查是否有权限
    const [hasPermission] = await call(ctx).checkUserPermissions(
      groupId,
      userId,
      [PERMISSION.core.manageUser]
    );
    if (!hasPermission) {
      throw new NoPermissionError(t('没有操作权限'));
    }

    // 检查是否踢出了不该踢出的人
    const groupInfo = await call(ctx).getGroupInfo(groupId);
    if (String(memberId) === String(groupInfo.owner)) {
      throw new Error(t('不允许踢出群组OP'));
    }

    const group = await this.adapter.model.findByIdAndUpdate(
      groupId,
      {
        $pull: {
          members: {
            userId: String(memberId),
          },
        },
      },
      { new: true }
    );

    await this.memberLeaveGroup(ctx, group, memberId);

    const memberInfo = await call(ctx).getUserInfo(memberId);
    await call(ctx).addGroupSystemMessage(
      groupId,
      `${ctx.meta.user.nickname} 将 ${memberInfo.nickname} 移出了本群组`
    );
  }

  /**
   * 退出群组流程
   * 用于踢出群组成员和主动退出群组
   *
   * 先将自己退出房间， 然后再进行房间级别通知
   */
  private async memberLeaveGroup(
    ctx: TcContext,
    group: Group,
    memberId: string
  ) {
    const groupId = String(group._id);

    await ctx.call('gateway.leaveRoom', {
      roomIds: [
        groupId,
        ...group.panels
          .filter((p) => p.type === GroupPanelType.TEXT)
          .map((p) => p.id),
      ], // 离开群组和所有面板房间
      memberId,
    });
    await Promise.all([
      this.unicastNotify(ctx, memberId, 'remove', { groupId }),
      this.notifyGroupInfoUpdate(ctx, group),
    ]);
  }

  /**
   * 发送通知群组信息发生变更
   *
   * 发送通知时会同时清空群组信息缓存
   */
  private async notifyGroupInfoUpdate(
    ctx: TcContext,
    group: Group | GroupStruct
  ): Promise<GroupStruct> {
    const groupId = String(group._id);
    let json: GroupStruct;
    if (_.isPlainObject(group) === false) {
      // 当传入的数据为group doc时
      json = await this.transformDocuments(ctx, {}, group);
    } else {
      json = group as any;
    }

    this.cleanGroupInfoCache(groupId);
    await this.roomcastNotify(ctx, groupId, 'updateInfo', json);

    return json;
  }

  /**
   * 清理群组缓存
   * @param groupId 群组id
   */
  private cleanGroupInfoCache(groupId: string) {
    this.cleanActionCache('getGroupBasicInfo', [groupId]);
    this.cleanActionCache('getGroupInfo', [groupId]);
  }

  /**
   * 清理群组用户缓存
   * @param groupId 群组id
   * @param userId 用户id
   */
  private cleanGroupUserPermission(groupId: string, userId: string) {
    this.cleanActionCache('getUserAllPermissions', [groupId, userId]);
  }

  /**
   * 清理群组所有用户缓存
   * @param groupId 群组id
   */
  private cleanGroupAllUserPermissionCache(groupId: string) {
    this.cleanActionCache('getUserAllPermissions', [groupId]);
  }
}

export default GroupService;
