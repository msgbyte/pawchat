import { setUserJWT } from '@/utils/jwt-helper';
import { setGlobalUserLoginInfo } from '@/utils/user-helper';
import React, { useMemo, useState } from 'react';
import {
  claimTemporaryUser,
  model,
  showErrorToasts,
  t,
  useAppDispatch,
  useAsyncRequest,
  userActions,
} from 'tailchat-shared';
import {
  createMetaFormSchema,
  MetaFormFieldMeta,
  metaFormFieldSchema,
  WebMetaForm,
  FastifyFormFieldProps,
  useFastifyFormContext,
} from 'tailchat-design';
import { ModalWrapper } from '../Modal';
import { Button, Input } from 'antd';
import _compact from 'lodash/compact';
import { getGlobalConfig } from 'tailchat-shared/model/config';

interface Values {
  email: string;
  password: string;
  emailOTP?: string;
  [key: string]: unknown;
}

const getFields = (): MetaFormFieldMeta[] =>
  _compact([
    { type: 'text', name: 'email', label: t('邮箱') },
    getGlobalConfig().emailVerification && {
      type: 'custom',
      name: 'emailOTP',
      label: t('邮箱校验码'),
      render: (props: FastifyFormFieldProps) => {
        const context = useFastifyFormContext<Values>();
        const email = context?.values?.['email'];
        const [sended, setSended] = useState(false);

        const [{ loading }, handleVerifyEmail] = useAsyncRequest(async () => {
          if (!email) {
            showErrorToasts(t('邮箱不能为空'));
            return;
          }
          await model.user.verifyEmail(email);
          setSended(true);
        }, [email]);

        return (
          <Input.Group compact style={{ display: 'flex' }}>
            <Input
              size="large"
              name={props.name}
              value={props.value}
              placeholder={t('6位校验码')}
              onChange={(e) => props.onChange(e.target.value)}
            />

            {!sended && (
              <Button
                size="large"
                type="primary"
                htmlType="button"
                disabled={loading}
                loading={loading}
                onClick={(e) => {
                  e.preventDefault();
                  handleVerifyEmail();
                }}
              >
                {t('发送校验码')}
              </Button>
            )}
          </Input.Group>
        );
      },
    },
    {
      type: 'password',
      name: 'password',
      label: t('密码'),
    },
  ]);

const schema = createMetaFormSchema({
  email: metaFormFieldSchema
    .string()
    .email(t('邮箱格式不正确'))
    .required(t('邮箱不能为空')),
  password: metaFormFieldSchema
    .string()
    .min(6, t('密码不能低于6位'))
    .required(t('密码不能为空')),
  emailOTP: metaFormFieldSchema.string().length(6, t('校验码为6位')),
});

interface ClaimTemporaryUserProps {
  userId: string;
  onSuccess?: () => void;
}
export const ClaimTemporaryUser: React.FC<ClaimTemporaryUserProps> = React.memo(
  (props) => {
    const userId = props.userId;
    const dispatch = useAppDispatch();
    const fields = useMemo(() => getFields(), []);

    const [{}, handleClaim] = useAsyncRequest(
      async (values: Values) => {
        const data = await claimTemporaryUser(
          userId,
          values.email,
          values.password,
          values.emailOTP
        );

        setGlobalUserLoginInfo(data);
        await setUserJWT(data.token);
        dispatch(userActions.setUserInfo(data));

        typeof props.onSuccess === 'function' && props.onSuccess();
      },
      [userId, props.onSuccess]
    );

    return (
      <ModalWrapper title={t('认领账号')}>
        <WebMetaForm schema={schema} fields={fields} onSubmit={handleClaim} />
      </ModalWrapper>
    );
  }
);
ClaimTemporaryUser.displayName = 'ClaimTemporaryUser';
