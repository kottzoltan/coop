import { MockFrame } from '../components/MockFrame';

interface MockPageProps {
  src: string;
  title: string;
  embedInit?: string;
}

export function MockPage({ src, title, embedInit }: MockPageProps) {
  return (
    <div className="flex h-screen flex-col">
      <MockFrame src={src} title={title} embedInit={embedInit} />
    </div>
  );
}
