import React from 'react';
import { Truck } from 'lucide-react';

export const ShippingForm = ({ shippingInfo, setShippingInfo, onSubmit, onBack }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="flex items-center gap-3 mb-6">
        <Truck className="text-blue-600" size={24} />
        <h2 className="text-2xl font-bold">Shipping Information</h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Street Address
          </label>
          <input
            type="text"
            required
            value={shippingInfo.street}
            onChange={(e) => setShippingInfo({ ...shippingInfo, street: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              required
              value={shippingInfo.city}
              onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State/Province
            </label>
            <input
              type="text"
              required
              value={shippingInfo.state}
              onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              required
              value={shippingInfo.postal_code}
              onChange={(e) => setShippingInfo({ ...shippingInfo, postal_code: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              required
              value={shippingInfo.country}
              onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-md hover:bg-gray-200 font-medium"
          >
            Back to Cart
          </button>
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-medium"
          >
            Continue to Payment
          </button>
        </div>
      </form>
    </div>
  );
};
