import { TcService, TcContext, call } from 'tailchat-server-sdk';

class GroupPreviewService extends TcService {
  get serviceName(): string {
    return 'group.preview';
  }

  onInit(): void {
    /**
     * TODO: 这里的action都应当判断一下群组是否支持预览
     */
    this.registerAction('joinGroupRooms', this.joinGroupRooms, {
      params: {
        groupId: 'string',
      },
    });
    this.registerAction('leaveGroupRooms', this.leaveGroupRooms, {
      params: {
        groupId: 'string',
      },
    });
    this.registerAction('getGroupInfo', this.getGroupInfo, {
      params: {
        groupId: 'string',
      },
    });
  }

  async joinGroupRooms(ctx: TcContext<{ groupId: string }>) {
    const groupId = ctx.params.groupId;

    const { textPanelIds, subscribeFeaturePanelIds } = await ctx.call<
      {
        textPanelIds: string[];
        subscribeFeaturePanelIds: string[];
      },
      { groupId: string }
    >('group.getGroupSocketRooms', {
      groupId,
    });

    await call(ctx).joinSocketIORoom([
      groupId,
      ...textPanelIds,
      ...subscribeFeaturePanelIds,
    ]);
  }

  async leaveGroupRooms(ctx: TcContext<{ groupId: string }>) {
    const groupId = ctx.params.groupId;

    const { textPanelIds, subscribeFeaturePanelIds } = await ctx.call<
      {
        textPanelIds: string[];
        subscribeFeaturePanelIds: string[];
      },
      { groupId: string }
    >('group.getGroupSocketRooms', {
      groupId,
    });

    await call(ctx).leaveSocketIORoom([
      groupId,
      ...textPanelIds,
      ...subscribeFeaturePanelIds,
    ]);
  }

  async getGroupInfo(ctx: TcContext<{ groupId: string }>) {
    const groupId = ctx.params.groupId;

    const groupInfo = await call(ctx).getGroupInfo(groupId);

    return groupInfo;
  }
}

export default GroupPreviewService;
