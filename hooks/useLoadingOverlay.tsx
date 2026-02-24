import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { LoadingOverlay } from '@/components/LoadingOverlay';

type LoadingOverlayContextValue = {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  setMessage: (message: string) => void;
  withLoading: <T>(task: () => Promise<T>, message?: string) => Promise<T>;
};

const LoadingOverlayContext = createContext<LoadingOverlayContextValue | undefined>(undefined);

export const LoadingOverlayProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const showLoading = useCallback((nextMessage?: string) => {
    setMessage(nextMessage);
    setVisible(true);
  }, []);

  const hideLoading = useCallback(() => {
    setVisible(false);
    setMessage(undefined);
  }, []);

  const updateMessage = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
  }, []);

  const withLoading = useCallback(
    async <T,>(task: () => Promise<T>, nextMessage?: string) => {
      showLoading(nextMessage);
      try {
        return await task();
      } finally {
        hideLoading();
      }
    },
    [hideLoading, showLoading]
  );

  const value = useMemo(
    () => ({
      showLoading,
      hideLoading,
      setMessage: updateMessage,
      withLoading,
    }),
    [hideLoading, showLoading, updateMessage, withLoading]
  );

  return (
    <LoadingOverlayContext.Provider value={value}>
      {children}
      <LoadingOverlay visible={visible} message={message} />
    </LoadingOverlayContext.Provider>
  );
};

export const useLoadingOverlay = () => {
  const context = useContext(LoadingOverlayContext);
  if (!context) {
    throw new Error('useLoadingOverlay must be used within a LoadingOverlayProvider');
  }
  return context;
};
