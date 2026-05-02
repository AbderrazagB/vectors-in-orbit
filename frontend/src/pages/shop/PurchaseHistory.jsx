import { useState, useEffect } from 'react';
import { Package, RefreshCw, CheckCircle, XCircle, Filter, AlertCircle, X } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { useToast } from '../../context/ToastContext';
import { Navigate } from 'react-router-dom';

const PurchaseHistory = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refundingId, setRefundingId] = useState(null);
  const [returnModal, setReturnModal] = useState({ isOpen: false, purchaseId: null, productName: '' });
  const [returnReason, setReturnReason] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user._id;
  const API_URL = import.meta.env.VITE_MONGO_BACKEND_URL;

  useEffect(() => {
    if (userId) {
      fetchPurchases();
    }
  }, [userId, filter]);

  const toast = useToast();

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' 
        ? `${API_URL}/api/purchases/user/${userId}`
        : `${API_URL}/api/purchases/user/${userId}?status=${filter}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setPurchases(data.purchases || []);
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
      toast.error('Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  };

  const returnProduct = async (purchaseId, productName) => {
    setReturnModal({ isOpen: true, purchaseId, productName });
  };

  const handleReturnSubmit = async () => {
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for the return');
      return;
    }
    
    setRefundingId(returnModal.purchaseId);
    try {
      const response = await fetch(
        `${API_URL}/api/purchases/${returnModal.purchaseId}/return`,
        { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: returnReason.trim() })
        }
      );
      
      if (response.ok) {
        toast.success('Product return initiated successfully');
        setReturnModal({ isOpen: false, purchaseId: null, productName: '' });
        setReturnReason('');
        fetchPurchases();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to return product');
      }
    } catch (error) {
      toast.error('Failed to process return request');
    } finally {
      setRefundingId(null);
    }
  };

  const closeReturnModal = () => {
    setReturnModal({ isOpen: false, purchaseId: null, productName: '' });
    setReturnReason('');
    setRefundingId(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'purchased':
        return 'bg-green-100 text-green-800';
      case 'returned':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'purchased':
        return <CheckCircle size={16} />;
      case 'returned':
        return <RefreshCw size={16} />;
      default:
        return <Package size={16} />;
    }
  };

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Purchase History</h1>
          <p className="text-slate-600">View and manage your past purchases</p>
        </div>

        {/* Filter Buttons */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="text-slate-400" size={20} />
            <span className="text-sm font-medium text-slate-700">Filter:</span>
            {['all', 'purchased', 'returned'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : purchases.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="mx-auto text-slate-300 mb-4" size={64} />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No purchases found</h3>
            <p className="text-slate-600 mb-6">
              {filter === 'all' 
                ? "You haven't made any purchases yet" 
                : `No ${filter} purchases found`}
            </p>
            <a
              href="/shop"
              className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Start Shopping
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => (
              <div
                key={purchase._id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {purchase.product_name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(
                          purchase.status
                        )}`}
                      >
                        {getStatusIcon(purchase.status)}
                        {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Quantity</p>
                        <p className="font-medium text-slate-900">{purchase.quantity}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Unit Price</p>
                        <p className="font-medium text-slate-900">
                          {purchase.price?.toFixed(3)} TND
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Total Amount</p>
                        <p className="font-bold text-emerald-600 text-base">
                          {(purchase.price * purchase.quantity)?.toFixed(3)} TND
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Purchase Date</p>
                        <p className="font-medium text-slate-900">
                          {new Date(purchase.purchase_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return Info */}
                {purchase.status === 'returned' && purchase.return_date && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                      <RefreshCw size={16} />
                      Return Information
                    </h4>
                    <div className="text-sm space-y-2">
                      <div>
                        <p className="text-yellow-700">Return Date</p>
                        <p className="font-medium text-yellow-900">
                          {new Date(purchase.return_date).toLocaleDateString()}
                        </p>
                      </div>
                      {purchase.return_reason && (
                        <div>
                          <p className="text-yellow-700">Return Reason</p>
                          <p className="font-medium text-yellow-900">
                            {purchase.return_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {purchase.status === 'purchased' && (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => returnProduct(purchase._id, purchase.product_name)}
                      disabled={refundingId === purchase._id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {refundingId === purchase._id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={16} />
                          Return Product
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Return Modal */}
      {returnModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Return Product</h3>
              <button
                onClick={closeReturnModal}
                disabled={refundingId}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-slate-700 mb-2">
                You are returning: <span className="font-semibold">{returnModal.productName}</span>
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Please provide a reason for this return
              </p>
              
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g., Product defective, Wrong item, Changed my mind..."
                disabled={refundingId}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                rows="4"
                maxLength="500"
              />
              <p className="text-xs text-slate-400 mt-1">
                {returnReason.length}/500 characters
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeReturnModal}
                disabled={refundingId}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnSubmit}
                disabled={refundingId || !returnReason.trim()}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {refundingId ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  'Submit Return'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;
