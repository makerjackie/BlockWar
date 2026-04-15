import type { ImgHTMLAttributes } from 'react';

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
};

export default function Image({ src, alt, width, height, ...rest }: ImageProps) {
  return <img src={src} alt={alt} width={width} height={height} {...rest} />;
}
