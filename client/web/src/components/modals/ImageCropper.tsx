import Cropper, { Area } from 'react-easy-crop';
import _isNil from 'lodash/isNil';
import { showToasts, t } from 'tailchat-shared';
import React, { useState } from 'react';
import { Button } from 'antd';
import { ModalWrapper } from '../Modal';

/**
 * 头像裁剪模态框
 */
export const ImageCropperModal: React.FC<{
  imageUrl: string;
  aspect?: number;
  maxSize?: number;
  onConfirm: (croppedImageBlobUrl: string) => void;
}> = React.memo((props) => {
  const aspect = props.aspect ?? 1;
  const maxSize = props.maxSize ?? Infinity;
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area>({ width: 0, height: 0, x: 0, y: 0 });

  const handleConfirm = async () => {
    const blobUrl = await getCroppedImg(
      await createImage(props.imageUrl),
      area,
      0,
      'newFile.jpeg',
      maxSize
    );
    props.onConfirm(blobUrl);
  };

  return (
    <ModalWrapper
      className="flex flex-col"
      style={{ width: '80vw', height: '80vh' }}
    >
      <div className="flex-1 relative mb-4">
        <Cropper
          image={props.imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, area) => setArea(area)}
        />
      </div>

      <Button type="primary" onClick={handleConfirm}>
        {t('确认')}
      </Button>
    </ModalWrapper>
  );
});
ImageCropperModal.displayName = 'ImageCropperModal';

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });
}

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

let fileUrlTemp: string | null = null; // 缓存裁剪后的图片url
/**
 * 根据裁剪信息裁剪原始图片
 * 生成一个临时的资源文件路径
 * @param image 原始图片元素
 * @param crop 裁剪信息
 * @param rotation 旋转角度
 * @param fileName 文件名
 * @param maxSize 最大尺寸
 * @returns 裁剪后的图片blob url
 */
function getCroppedImg(
  image: HTMLImageElement,
  crop: Area,
  rotation = 0,
  fileName = 'newFile.jpeg',
  maxSize = Infinity
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!_isNil(ctx)) {
    // 计算最大尺寸
    const size = Math.min(Math.max(crop.width, crop.height), maxSize);

    // 计算缩放比例
    const scale = size / Math.max(crop.width, crop.height);

    canvas.width = scale * crop.width;
    canvas.height = scale * crop.height;

    // translate canvas context to a central location on image to allow rotating around the center.
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(getRadianAngle(rotation));
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // draw rotated image and store data.
    ctx.drawImage(
      image,
      0,
      0,
      image.width,
      image.height,
      -crop.x * scale,
      -crop.y * scale,
      image.width * scale,
      image.height * scale
    );
  }

  return new Promise<string>((resolve) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          // reject(new Error('Canvas is empty'));
          console.error('Canvas is empty');
          return;
        }
        (blob as any).name = fileName;
        if (typeof fileUrlTemp === 'string') {
          window.URL.revokeObjectURL(fileUrlTemp);
        }
        fileUrlTemp = window.URL.createObjectURL(blob);
        resolve(fileUrlTemp);
      }, 'image/jpeg');
    } catch (err) {
      console.error(err);
      showToasts('无法正确生成图片, 可能是因为您的浏览器版本过旧', 'error');
    }
  });
}
