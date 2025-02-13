import React from 'react';
import {
  modifyUserPassword,
  showToasts,
  t,
  useAsyncRequest,
} from 'tailchat-shared';
import { ModalWrapper } from '../Modal';
import {
  createMetaFormSchema,
  MetaFormFieldMeta,
  metaFormFieldSchema,
  WebMetaForm,
} from 'tailchat-design';

interface Values {
  oldPassword: string;
  newPassword: string;
  newPasswordRepeat: string;
}

const fields: MetaFormFieldMeta[] = [
  {
    type: 'password',
    name: 'oldPassword',
    label: t('旧密码'),
  },
  {
    type: 'password',
    name: 'newPassword',
    label: t('新密码'),
  },
  {
    type: 'password',
    name: 'newPasswordRepeat',
    label: t('重复密码'),
  },
];

const schema = createMetaFormSchema({
  oldPassword: metaFormFieldSchema
    .string()
    .min(6, t('密码不能低于6位'))
    .required(t('密码不能为空')),
  newPassword: metaFormFieldSchema
    .string()
    .min(6, t('密码不能低于6位'))
    .matches(/[A-Z]/, '密码必须包含大写字母')  
    .matches(/[a-z]/, '密码必须包含小写字母')  
    .matches(/\d/, '密码必须包含数字')  
    .matches(/[`~!@#$%^&*()_+./,;':"*]/, '密码必须包含符号')  
    .required(t('密码不能为空')),
  newPasswordRepeat: metaFormFieldSchema
    .string()
    .min(6, t('密码不能低于6位'))
    .required(t('密码不能为空')),
});

interface ModifyPasswordProps {
  onSuccess?: () => void;
}
export const ModifyPassword: React.FC<ModifyPasswordProps> = React.memo(
  (props) => {
    const [{}, handleModifyPassword] = useAsyncRequest(
      async (values: Values) => {
        if (values.newPassword !== values.newPasswordRepeat) {
          showToasts(t('新旧密码不匹配'), 'warning');
          return;
        }

        await modifyUserPassword(values.oldPassword, values.newPassword);
        showToasts(t('密码修改成功'), 'success');

        typeof props.onSuccess === 'function' && props.onSuccess();
      },
      [props.onSuccess]
    );

    return (
      <ModalWrapper title={t('修改密码')}>
        <WebMetaForm
          schema={schema}
          fields={fields}
          onSubmit={handleModifyPassword}
        />
      </ModalWrapper>
    );
  }
);
ModifyPassword.displayName = 'ModifyPassword';
