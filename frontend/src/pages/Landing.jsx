import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Store, Sparkles, TrendingUp, Shield, Zap, Users, BarChart3 } from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { Button } from '../components/ui/Button';
import { Navbar } from '../components/Navbar';

// Unified Card Component for sections
const FeatureCard = ({ icon: Icon, title, desc, delay, variant = "emerald" }) => {
  const colors = {
    emerald: "bg-emerald-100 text-emerald-600 border-emerald-200",
    blue: "bg-blue-100 text-blue-600 border-blue-200",
    purple: "bg-purple-100 text-purple-600 border-purple-200",
  };

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white/60 backdrop-blur-md p-8 rounded-2xl border border-slate-200 hover:shadow-xl hover:border-emerald-400/50 transition-all duration-300"
    >
      <div className={`w-14 h-14 ${colors[variant].split(' ')[0]} rounded-xl flex items-center justify-center mb-6`}>
        <Icon className={colors[variant].split(' ')[1]} size={28} />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </motion.div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { setUserRole } = useContext(StoreContext);

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-x-hidden">
      
      {/* 1. FIXED BACKGROUND LAYER (Z-0) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{ x: [0, 80, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[5%] left-[5%] w-[45%] h-[45%] bg-emerald-200/30 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{ x: [0, -70, 0], y: [0, 60, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[25%] right-[5%] w-[40%] h-[40%] bg-blue-200/25 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[10%] left-[10%] w-[35%] h-[35%] bg-purple-200/20 blur-[100px] rounded-full"
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[5%] right-[15%] w-[30%] h-[30%] bg-pink-200/20 blur-[110px] rounded-full"
        />
      </div>

      {/* 2. NAVBAR (Z-50) */}
      <Navbar variant="landing" />

      {/* 3. CONTENT LAYER (Z-10) - All sections must be bg-transparent */}
      <div className="relative z-10 w-full">
        
        {/* Hero Section */}
        <section className="min-h-screen flex items-center pt-20 bg-transparent">
          <div className="max-w-7xl mx-auto px-6 py-20 w-full">
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }}
              className="max-w-3xl"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100/80 text-emerald-700 text-sm font-bold mb-6 border border-emerald-200 backdrop-blur-md">
                AI-Powered Commerce
              </span>
              <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
                Shopping that <br/> <span className="text-emerald-600">Understands You.</span>
              </h1>
              <p className="text-slate-600 text-xl mb-10 leading-relaxed max-w-2xl">
                Experience a marketplace that adapts to your budget and taste. 
                Can't find what you need? Use our <span className="text-emerald-600 font-semibold">Smart Request</span> feature.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => navigate('/login')} variant="primary" className="!px-8 !py-4 !text-lg !rounded-xl shadow-lg shadow-emerald-200">
                  Get Started
                </Button>
                <Button onClick={() => navigate('/shop')} variant="outline" className="!px-8 !py-4 !text-lg !rounded-xl !bg-white/50 backdrop-blur-sm">
                  Browse Products
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Shoppers Section */}
        <section className="py-24 bg-transparent">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                For <span className="text-emerald-600">Shoppers</span>
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                Discover a personalized shopping experience powered by AI
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={Sparkles} 
                title="Smart Recommendations" 
                desc="Our AI learns your preferences and suggests products that match your style perfectly."
                variant="emerald"
                delay={0.1}
              />
              <FeatureCard 
                icon={Zap} 
                title="Smart Request" 
                desc="Can't find what you're looking for? Describe it and our AI will find alternatives instantly."
                variant="blue"
                delay={0.2}
              />
              <FeatureCard 
                icon={Shield} 
                title="Secure & Fast" 
                desc="Shop with confidence. Your data is protected and checkout is seamless across all devices."
                variant="purple"
                delay={0.3}
              />
            </div>
          </div>
        </section>

        {/* Shops Section */}
        <section className="py-24 bg-transparent">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                For <span className="text-emerald-600">Shops</span>
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                Grow your business with AI-powered insights and reach the right customers
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard icon={BarChart3} title="AI Analytics" desc="Get real-time insights on customer behavior and trending products." variant="emerald" delay={0.1} />
              <FeatureCard icon={Users} title="Smart Targeting" desc="Our AI matches your products with customers most likely to buy." variant="blue" delay={0.2} />
              <FeatureCard icon={TrendingUp} title="Grow Revenue" desc="Automated inventory management and dynamic pricing recommendations." variant="purple" delay={0.3} />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-transparent">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              className="relative bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-12 md:p-20 text-center shadow-2xl overflow-hidden"
            >
              {/* Internal Blobs for the CTA specifically */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
              </div>
              
              <div className="relative z-10">
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">
                  Ready to Get Started?
                </h2>
                <p className="text-emerald-50 text-xl mb-10 max-w-2xl mx-auto opacity-90">
                  Join thousands of shoppers and merchants who are already experiencing the future of commerce.
                </p>
                <Button 
                  onClick={() => navigate('/login')} 
                  className="!bg-white !text-emerald-600 !px-10 !py-5 !text-xl !rounded-2xl !font-extrabold hover:!bg-emerald-50 transition-transform hover:scale-105 active:scale-95"
                >
                  Sign Up Now
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer spacer */}
        <footer className="py-12 text-center text-slate-400 text-sm">
          © 2026 NexusAI Systems. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default Landing;