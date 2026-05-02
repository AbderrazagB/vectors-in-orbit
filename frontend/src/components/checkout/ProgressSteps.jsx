import React from 'react';

export const ProgressSteps = ({ currentStep }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-24 h-1 mx-2 ${
                  currentStep > s ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 px-12">
        <span className="text-sm">Shipping</span>
        <span className="text-sm">Payment</span>
        <span className="text-sm">Confirmation</span>
      </div>
    </div>
  );
};
