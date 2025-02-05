import React, { PropsWithChildren, useRef } from 'react';
import { closeModal, openModal } from './Modal';
import { showToasts, t, useEvent } from 'tailchat-shared';
import { Icon } from 'tailchat-design';
import { ImageCropperModal } from './modals/ImageCropper';
import { isGIF } from '@/utils/file-helper';
import clsx from 'clsx';

interface ImagePickerProps extends PropsWithChildren {
  className?: string;
  imageUrl?: string; // 初始image url, 仅children为空时生效
  aspect?: number;
  maxSize?: number;
  onChange?: (blobUrl: string) => void;
  disabled?: boolean; // 禁用选择
}
/**
 * 头像选择器
 */
export const ImagePicker: React.FC<ImagePickerProps> = React.memo((props) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const updateAvatar = (imageBlobUrl: string) => {
    if (typeof props.onChange === 'function') {
      props.onChange(imageBlobUrl);
    }
  };

  const handleSelectFile = useEvent(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const pickedFile = e.target.files[0];
        if (!pickedFile) {
          return;
        }

        if (isGIF(pickedFile)) {
          updateAvatar(URL.createObjectURL(pickedFile));
        } else {
          const reader = new FileReader();
          reader.addEventListener('load', () => {
            if (reader.result) {
              const key = openModal(
                <ImageCropperModal
                  imageUrl={reader.result.toString()}
                  aspect={props.aspect}
                  maxSize={props.maxSize}
                  onConfirm={(croppedImageBlobUrl) => {
                    closeModal(key);
                    updateAvatar(croppedImageBlobUrl);
                  }}
                />,
                {
                  maskClosable: false,
                  closable: true,
                }
              );
            } else {
              showToasts(t('文件读取失败'), 'error');
            }
          });
          reader.readAsDataURL(pickedFile);
        }

        // 清理选中状态
        e.target.files = null;
        e.target.value = '';
      }
    }
  );

  return (
    <div className={props.className}>
      <div
        className="cursor-pointer inline-block relative"
        onClick={() => !props.disabled && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleSelectFile}
          accept="image/*"
        />

        <div className={clsx('group', props.className)}>
          {props.children}

          <div
            className={
              'absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center transition opacity-0 group-hover:opacity-100'
            }
          >
            <Icon
              className="text-white opacity-80 text-4xl"
              icon="mdi:camera-outline"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
ImagePicker.displayName = 'ImagePicker';
