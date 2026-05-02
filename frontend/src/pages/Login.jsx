import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Store, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Navbar } from '../components/Navbar';
import { StoreContext } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUserRole, checkAuthStatus } = useContext(StoreContext);
  const roleFromState = location.state?.role;

  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState(roleFromState || 'shopper');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
    age: '',
    gender: '',
    region: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isLogin) {
      // Signup validation
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match!');
        return;
      }
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    }

    try {
      const MONGO_BACKEND_URL = import.meta.env.VITE_MONGO_BACKEND_URL;
      const endpoint = isLogin ? `${MONGO_BACKEND_URL}/api/auth/login` : `${MONGO_BACKEND_URL}/api/auth/register`;
      
      // Truncate password to 72 bytes max for bcrypt
      const truncatedPassword = formData.password.slice(0, 72);
      
      const body = isLogin 
        ? { email: formData.email, password: truncatedPassword }
        : { 
            email: formData.email, 
            password: truncatedPassword, 
            name: formData.name,
            user_type: userType === 'shopper' ? 'customer' : 'vendor',
            ...(userType === 'shopper' && {
              age: parseInt(formData.age) || null,
              gender: formData.gender || null,
              region: formData.region || null
            })
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.detail || 'Authentication failed');
        return;
      }

      // Store token and user data
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update auth state
      checkAuthStatus();
      
      // Navigate based on user type
      if (data.user.user_type === 'vendor') {
        navigate('/vendor');
      } else {
        navigate('/shop');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <Navbar variant="landing" />

      <div className="flex-1 flex items-center justify-center px-4 py-4 pt-20">
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-6 items-center h-[calc(100vh-6rem)] max-h-[850px]">
          {/* Left Side - Branding */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="hidden md:block h-full"
          >
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-2xl p-8 text-white shadow-2xl h-full flex flex-col justify-center">
              <h1 className="text-4xl font-bold mb-4">
                Welcome to <br />Nexus AI
              </h1>
              <p className="text-emerald-50 text-base leading-relaxed mb-6">
                {userType === 'vendor' 
                  ? 'Grow your business with AI-powered insights and smart customer targeting.'
                  : 'Experience shopping that understands your taste and adapts to your budget.'
                }
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">AI-Powered</h3>
                    <p className="text-emerald-100 text-sm">Smart recommendations tailored just for you</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Secure & Fast</h3>
                    <p className="text-emerald-100 text-sm">Your data is protected with enterprise-grade security</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">24/7 Support</h3>
                    <p className="text-emerald-100 text-sm">We're here to help whenever you need us</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Form */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl shadow-xl p-8 h-full flex flex-col justify-center overflow-hidden"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                {isLogin ? 'Welcome Back!' : 'Create Account'}
              </h2>
              <p className="text-slate-600 text-sm">
                {isLogin ? 'Sign in to continue your journey' : 'Join us and start your experience'}
              </p>
            </div>

            {/* User Type Selector */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">I am a:</label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('shopper')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                    userType === 'shopper'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <User size={18} />
                  <span className="font-medium">Shopper</span>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name and Email Row for Signup */}
              {!isLogin ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required={!isLogin}
                          placeholder="John Doe"
                          className="w-full pl-10 pr-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="you@example.com"
                          className="w-full pl-10 pr-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Row for Signup */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required={!isLogin}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional fields for shoppers */}
                  {userType === 'shopper' && (
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Age
                        </label>
                        <input
                          type="number"
                          name="age"
                          value={formData.age}
                          onChange={handleChange}
                          placeholder="25"
                          min="13"
                          max="120"
                          className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Gender
                        </label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all bg-white"
                        >
                          <option value="">Select</option>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="O">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Region
                        </label>
                        <input
                          type="text"
                          name="region"
                          value={formData.region}
                          onChange={handleChange}
                          placeholder="Tunis"
                          className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Login Form - Vertical Layout */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {isLogin && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-slate-600">Remember me</span>
                  </label>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="!w-full !py-3 !text-base !font-semibold"
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>


          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
