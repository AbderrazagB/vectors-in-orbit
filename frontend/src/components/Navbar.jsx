import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Search, Heart } from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';

export const Navbar = ({ variant = 'authenticated' }) => {
  const { cart, userRole, isAuthenticated, logout } = useContext(StoreContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    navigate('/login');
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for fixed navbar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Landing/Login variant - for unauthenticated users
  if (variant === 'landing') {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold">
              N
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Nexus<span className="text-emerald-600">AI</span></span>
          </button>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/shop')} className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              Products
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate('/login')} 
              variant="outline"
              className="!border-slate-300 !text-slate-700 hover:!bg-slate-50"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => navigate('/login')} 
              variant="primary"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  // If not authenticated, show a minimal header prompting sign-in
  if (!isAuthenticated) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold">
              N
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Nexus<span className="text-emerald-600">AI</span></span>
          </button>

          <div className="hidden md:flex items-center gap-6">
            <span className="text-sm text-slate-600">Sign in to access shop features</span>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/login')} variant="outline" className="!border-slate-300 !text-slate-700 hover:!bg-slate-50">Sign In</Button>
            <Button onClick={() => navigate('/login')} variant="primary">Get Started</Button>
          </div>
        </div>
      </nav>
    );
  }

  // Authenticated variant - for logged in users
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        
        {/* Logo */}
        <Link to={userRole === 'vendor' ? '/vendor' : '/shop'} className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-200 transition-transform group-hover:rotate-3">N</div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Nexus<span className="text-emerald-600">AI</span></span>
        </Link>

        {/* Center Nav */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink to="/shop" active={location.pathname === '/shop' && !location.search}>
            Shop
          </NavLink>
          <NavLink to="/shop?tab=fashion" active={location.search.includes('tab=fashion')}>
            Fashion
          </NavLink>
          <NavLink to="/shop?tab=electronics" active={location.search.includes('tab=electronics')}>
            Electronics
          </NavLink>
          <NavLink to="/shop?tab=baby" active={location.search.includes('tab=baby')}>
            Baby Products
          </NavLink>
          <NavLink to="/wishlist" active={location.pathname === '/wishlist'}>
            My Wishlist
          </NavLink>
          <NavLink to="/purchases" active={location.pathname === '/purchases'}>
            Purchases
          </NavLink>
        </div>


        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link to="/cart" className="relative p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ShoppingBag size={20} className="text-slate-700" />
            {cart.length > 0 && (
              <motion.span 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
              >
                {cart.length}
              </motion.span>
            )}
          </Link>
          
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          
          <button onClick={handleLogout} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            Log Out
          </button>
        </div>
      </div>
    </nav>
  );
};

const NavLink = ({ to, children, active }) => (
  <Link to={to} className={`text-sm font-medium transition-colors ${active ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}>
    {children}
  </Link>
);