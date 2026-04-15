import { Children, type ReactElement, type ReactNode, useEffect } from 'react';

export default function Head({ children }: { children: ReactNode }) {
  useEffect(() => {
    const titleNode = Children.toArray(children).find(
      (child): child is ReactElement =>
        typeof child === 'object' &&
        child !== null &&
        'type' in child &&
        child.type === 'title'
    );

    const nextTitle = titleNode?.props?.children;
    if (typeof nextTitle === 'string') {
      document.title = nextTitle;
    }
  }, [children]);

  return null;
}
