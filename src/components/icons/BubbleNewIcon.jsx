import React from 'react';
import benkaIconUrl from '../../assets/benka.svg?url';

export default function BubbleNewIcon({
  size = 64,
  title = 'Benka AI icon',
  className,
  ...props
}) {
  return (
    <img
      src={benkaIconUrl}
      width={size}
      height={size}
      alt={title}
      title={title}
      className={className}
      {...props}
    />
  );
}
