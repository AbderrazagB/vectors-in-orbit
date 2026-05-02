import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { ShopTab } from './ShopTab';
import { CategoryTab } from './CategoryTab';

const ShopHome = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('shop');

  // Handle URL query params for tab navigation
  const urlTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    return tab && ['all', 'fashion', 'electronics', 'baby'].includes(tab) ? tab : 'shop';
  }, [location.search]);

  // Update activeTab when URL changes
  useEffect(() => {
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'shop':
        return <ShopTab />;
      case 'fashion':
        return <CategoryTab category="fashion" />;
      case 'electronics':
        return <CategoryTab category="electronics" />;
      case 'baby':
        return <CategoryTab category="baby" />;
      default:
        return <ShopTab />;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 pb-20 ${activeTab === 'shop' ? 'pt-16' : 'pt-[140px]'}`}>
      <Navbar />
      {renderTabContent()}
    </div>
  );
};

export default ShopHome;

