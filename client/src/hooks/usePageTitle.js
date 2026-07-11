import { useEffect } from 'react';

export const usePageTitle = (title) => {
  useEffect(() => {
    document.title = `ForReal — ${title}`;
    
    // Optional: cleanup to a default title, though usually we just overwrite on next page
    return () => {
      document.title = "ForReal | We Don't Talk Shit";
    };
  }, [title]);
};
