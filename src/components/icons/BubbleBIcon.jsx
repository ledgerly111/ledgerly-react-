import React from 'react';
import BubbleNewIcon from './BubbleNewIcon.jsx';

export default function BubbleBIcon({ size = 64, title = 'Benka AI icon', ...props }) {
  return <BubbleNewIcon size={size} title={title} {...props} />;
}
