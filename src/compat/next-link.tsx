import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface LinkProps extends PropsWithChildren {
  href: string;
  style?: CSSProperties;
}

function isExternal(href: string) {
  return /^(https?:)?\/\//.test(href) || href.startsWith('mailto:');
}

export default function Link({ href, children, ...rest }: LinkProps) {
  if (isExternal(href)) {
    return (
      <a href={href} {...rest} target='_blank' rel='noreferrer'>
        {children as ReactNode}
      </a>
    );
  }

  return (
    <RouterLink to={href} {...rest}>
      {children as ReactNode}
    </RouterLink>
  );
}
