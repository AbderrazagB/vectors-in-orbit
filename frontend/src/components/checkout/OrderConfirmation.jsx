import React from 'react';
import { CheckCircle } from 'lucide-react';

export const OrderConfirmation = ({ orderId, onViewPurchases, onContinueShopping }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
      <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
      <p className="text-gray-600 mb-6">
        Thank you for your purchase. Your order has been successfully placed.
      </p>
      
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <p className="text-sm text-gray-600 mb-1">Order Number</p>
        <p className="text-xl font-mono font-bold">{orderId}</p>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        A confirmation email has been sent to your email address with order details.
      </p>

      <div className="flex gap-4 justify-center">
        <button
          onClick={onViewPurchases}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          View Purchase History
        </button>
        <button
          onClick={onContinueShopping}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
};
