import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext();

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title = '', message = '', duration = 4000 }) => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, type, title, message }]);

    // auto remove
    setTimeout(() => {
      setToasts((t) => t.filter(x => x.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter(x => x.id !== id));
  }, []);

  const value = {
    show: (message, opts = {}) => addToast({ message, ...opts }),
    success: (message, opts = {}) => addToast({ type: 'success', message, ...opts }),
    error: (message, opts = {}) => addToast({ type: 'error', message, ...opts }),
    info: (message, opts = {}) => addToast({ type: 'info', message, ...opts }),
    toasts
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-6 bottom-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-sm w-full rounded-lg p-3 shadow-lg text-sm text-white ${t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
            {t.title && <div className="font-semibold mb-1">{t.title}</div>}
            <div>{t.message}</div>
            <button onClick={() => removeToast(t.id)} className="ml-auto mt-2 text-xs underline">Dismiss</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
