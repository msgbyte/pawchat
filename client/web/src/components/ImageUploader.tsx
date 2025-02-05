import { blobUrlToFile } from '@/utils/file-helper';
import clsx from 'clsx';
import React, { PropsWithChildren, useState } from 'react';
import {
  uploadFile,
  UploadFileResult,
  UploadFileUsage,
  useAsyncRequest,
} from 'tailchat-shared';
import { ImagePicker } from './ImagePicker';

interface ImageUploaderProps extends PropsWithChildren {
  circle?: boolean;
  aspect?: number;
  maxSize?: number;
  className?: string;
  usage?: UploadFileUsage;
  onUploadSuccess: (fileInfo: UploadFileResult) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = React.memo(
  (props) => {
    const aspect = props.aspect ?? 1;
    const [uploadProgress, setUploadProgress] = useState(0); // 0 - 100
    const [{ loading }, handlePickImage] = useAsyncRequest(
      async (blobUrl: string) => {
        const file = await blobUrlToFile(blobUrl);

        const fileInfo = await uploadFile(file, {
          usage: props.usage,
          onProgress(percent) {
            const uploadProgress = Number((percent * 100).toFixed());
            console.log(`进度:${uploadProgress}`);
            setUploadProgress(uploadProgress);
          },
        });

        console.log('上传成功', fileInfo);
        props.onUploadSuccess(fileInfo);
      },
      []
    );

    return (
      <ImagePicker
        className={clsx(props.className, 'relative overflow-hidden', {
          'rounded-full': props.circle,
        })}
        aspect={aspect}
        maxSize={props.maxSize}
        disabled={loading}
        onChange={handlePickImage}
      >
        {loading && (
          <div
            className="absolute bottom-0 left-0 h-1"
            style={{ width: `${uploadProgress}%` }}
          />
        )}

        {props.children}
      </ImagePicker>
    );
  }
);
ImageUploader.displayName = 'ImageUploader';

export const AvatarUploader: React.FC<ImageUploaderProps> = React.memo(
  (props) => {
    return (
      <ImageUploader
        aspect={1}
        maxSize={256}
        circle={true}
        {...props}
      ></ImageUploader>
    );
  }
);
AvatarUploader.displayName = 'AvatarUploader';
