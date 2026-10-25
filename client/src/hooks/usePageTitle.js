import { useEffect } from 'react';

const DEFAULT_TITLE = 'ForReal — Don’t just post it. Defend it.';

export const usePageTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} · ForReal` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
};
