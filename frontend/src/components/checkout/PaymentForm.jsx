import React from 'react';
import { CreditCard } from 'lucide-react';

export const PaymentForm = ({ paymentMethod, setPaymentMethod, cart, onSubmit, onBack, loading }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="text-blue-600" size={24} />
        <h2 className="text-2xl font-bold">Payment Method</h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-3">
          <label className="flex items-center p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="payment"
              value="credit_card"
              checked={paymentMethod === 'credit_card'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mr-3"
            />
            <div>
              <div className="font-medium">Credit Card</div>
              <div className="text-sm text-gray-600">Pay with credit or debit card</div>
            </div>
          </label>

          <label className="flex items-center p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="payment"
              value="paypal"
              checked={paymentMethod === 'paypal'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mr-3"
            />
            <div>
              <div className="font-medium">PayPal</div>
              <div className="text-sm text-gray-600">Pay with your PayPal account</div>
            </div>
          </label>

          <label className="flex items-center p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="payment"
              value="cash_on_delivery"
              checked={paymentMethod === 'cash_on_delivery'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mr-3"
            />
            <div>
              <div className="font-medium">Cash on Delivery</div>
              <div className="text-sm text-gray-600">Pay when you receive the order</div>
            </div>
          </label>
        </div>

        {/* Order Summary */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="font-semibold mb-4">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>${cart.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span>Free</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-base">
              <span>Total</span>
              <span>${cart.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-md hover:bg-gray-200 font-medium"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-medium disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </form>
    </div>
  );
};
