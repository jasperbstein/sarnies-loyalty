'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert, AlertVariant } from './Alert';

interface AlertMessage {
  id: string;
  variant: AlertVariant;
  title?: string;
  message: string;
  autoDismiss?: boolean;
  dismissDelay?: number;
}

interface AlertContextType {
  addAlert: (alert: Omit<AlertMessage, 'id'>) => void;
  removeAlert: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: React.ReactNode;
  maxAlerts?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const AlertProvider: React.FC<AlertProviderProps> = ({
  children,
  maxAlerts = 3,
  position = 'top-right',
}) => {
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const addAlert = useCallback(
    (alert: Omit<AlertMessage, 'id'>) => {
      const id = `alert-${Date.now()}-${Math.random()}`;
      const newAlert: AlertMessage = {
        ...alert,
        id,
        autoDismiss: alert.autoDismiss ?? true,
        dismissDelay: alert.dismissDelay ?? 5000,
      };

      setAlerts((prev) => {
        const updated = [newAlert, ...prev];
        return updated.slice(0, maxAlerts);
      });
    },
    [maxAlerts]
  );

  const success = useCallback(
    (message: string, title?: string) => {
      addAlert({ variant: 'success', message, title });
    },
    [addAlert]
  );

  const error = useCallback(
    (message: string, title?: string) => {
      addAlert({ variant: 'error', message, title, autoDismiss: false });
    },
    [addAlert]
  );

  const warning = useCallback(
    (message: string, title?: string) => {
      addAlert({ variant: 'warning', message, title });
    },
    [addAlert]
  );

  const info = useCallback(
    (message: string, title?: string) => {
      addAlert({ variant: 'info', message, title });
    },
    [addAlert]
  );

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <AlertContext.Provider value={{ addAlert, removeAlert, success, error, warning, info }}>
      {children}
      <div
        className={`fixed ${positionClasses[position]} z-[9999] flex flex-col gap-3 w-full max-w-md pointer-events-none`}
      >
        {alerts.map((alert, index) => (
          <div
            key={alert.id}
            className="pointer-events-auto"
            style={{
              animation: `slideInRight 0.2s ease-out ${index * 0.05}s both`,
            }}
          >
            <Alert
              variant={alert.variant}
              title={alert.title}
              message={alert.message}
              onClose={() => removeAlert(alert.id)}
              autoDismiss={alert.autoDismiss}
              dismissDelay={alert.dismissDelay}
            />
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
};
