import React from 'react';
import OptimizedImage from './OptimizedImage';
import images from '../data/quizImageManifest.json';

export default function QuizImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <OptimizedImage {...props} imageManifest={images} />;
}
