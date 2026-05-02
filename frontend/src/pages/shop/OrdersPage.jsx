import { useEffect, useState } from 'react';
import { useOrder } from '../../context/OrderContext';
import { Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';

const OrdersPage = () => {
  const { orders, loading, fetchOrders } = useOrder();

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="text-yellow-600" size={20} />;
      case 'processing':
        return <Package className="text-blue-600" size={20} />;
      case 'shipped':
        return <Truck className="text-purple-600" size={20} />;
      case 'delivered':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'cancelled':
        return <XCircle className="text-red-600" size={20} />;
      default:
        return <Package className="text-gray-600" size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Package className="mx-auto h-16 w-16 text-gray-400" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">No orders yet</h2>
            <p className="mt-2 text-gray-600">Start shopping to create your first order</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-lg shadow-sm p-6">
              {/* Order Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">Order #{order._id}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(
                        order.order_status
                      )}`}
                    >
                      {getStatusIcon(order.order_status)}
                      {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Placed on {new Date(order.order_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${order.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t border-gray-200 pt-4">
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-md overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-grow">
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Info */}
              <div className="border-t border-gray-200 mt-4 pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Shipping Address</h4>
                <p className="text-sm text-gray-600">
                  {order.shipping_address.street}<br />
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}<br />
                  {order.shipping_address.country}
                </p>
                
                {order.tracking_number && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">
                      Tracking Number: <span className="font-mono font-medium">{order.tracking_number}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Info */}
              <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">
                    Payment Method: <span className="font-medium capitalize">{order.payment_method.replace('_', ' ')}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Payment Status: <span className={`font-medium ${
                      order.payment_status === 'completed' ? 'text-green-600' :
                      order.payment_status === 'failed' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
