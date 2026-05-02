import React, { useContext, useState } from 'react';
import axios from 'axios';
import { Package, Plus, Target, Settings, Upload } from 'lucide-react';
import { StoreContext } from '../../context/StoreContext';
import { Navbar } from '../../components/Navbar';
import { Button } from '../../components/ui/Button';

const VendorDashboard = () => {
  const { products, fetchProducts, API_URL } = useContext(StoreContext);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'identity'
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "Electronics", description: "", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80" });
  const [identity, setIdentity] = useState({ name: "TechHaven", tagline: "Future of Electronics", audience: "Students, Gamers" });

  const handleAddProduct = async (e) => {
    e.preventDefault();
    await axios.post(`${API_URL}/products`, { ...newProduct, price: parseFloat(newProduct.price), currency: "TND" });
    fetchProducts();
    setShowAddModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar */}
          <div className="w-full md:w-64 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'inventory' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
              <Package size={20} /> Inventory
            </button>
            <button 
              onClick={() => setActiveTab('identity')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'identity' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
              <Target size={20} /> Brand Identity
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'inventory' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Product Inventory</h2>
                    <p className="text-slate-500">Manage your catalog and pricing.</p>
                  </div>
                  <Button onClick={() => setShowAddModal(true)} variant="primary"><Plus size={18} /> Add Product</Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 text-sm">
                        <th className="py-3 px-2">Product</th>
                        <th className="py-3 px-2">Category</th>
                        <th className="py-3 px-2">Price</th>
                        <th className="py-3 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-2 flex items-center gap-3">
                            <img src={p.image} className="w-10 h-10 rounded bg-slate-100 object-cover" />
                            <span className="font-medium text-slate-900">{p.name}</span>
                          </td>
                          <td className="py-3 px-2 text-slate-500 text-sm"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{p.category}</span></td>
                          <td className="py-3 px-2 font-mono text-emerald-600">{p.price}</td>
                          <td className="py-3 px-2 text-right">
                            <button className="text-sm text-slate-400 hover:text-slate-900 font-medium">Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'identity' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl">
                <h2 className="text-2xl font-bold mb-6">Brand Identity</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Store Name</label>
                    <input className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none" value={identity.name} onChange={e => setIdentity({...identity, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Tagline / Mission</label>
                    <input className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none" value={identity.tagline} onChange={e => setIdentity({...identity, tagline: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Target Audience</label>
                    <textarea className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none h-32" value={identity.audience} onChange={e => setIdentity({...identity, audience: e.target.value})} />
                    <p className="text-xs text-slate-500 mt-2">This data helps our Agent optimize your store's ranking for specific user segments.</p>
                  </div>
                  <Button>Save Identity</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Product Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Add New Product</h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <input placeholder="Product Name" className="w-full border p-3 rounded-lg" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
              <div className="flex gap-4">
                <input placeholder="Price" type="number" className="flex-1 border p-3 rounded-lg" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                <input placeholder="Category" className="flex-1 border p-3 rounded-lg" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
              </div>
              <input placeholder="Image URL" className="w-full border p-3 rounded-lg" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} />
              <textarea placeholder="Description" className="w-full border p-3 rounded-lg h-24" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
              
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit">Publish Product</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;