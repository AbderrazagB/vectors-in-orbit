import React from 'react';

export const ErrorScreen = ({ message = 'Something went wrong', onRetry, homeHref = '/shop' }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="bg-white rounded-lg shadow-sm p-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{message}</h2>
          <p className="text-slate-600 mb-6">Please check your network connection or try again.</p>
          <div className="flex items-center justify-center gap-4">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Retry
              </button>
            )}

            <a
              href={homeHref}
              className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700"
            >
              Back to Shop
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
