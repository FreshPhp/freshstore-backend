import React, { useEffect, useState } from 'react';
import { products } from '../lib/api';
import ProductCard from '../components/ProductCard';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Input } from '../components/ui/input';

export default function ProductsPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedPlatform, allProducts]);

  const loadProducts = async () => {
    try {
      const response = await products.getAll();
      setAllProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...allProducts];

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.platform.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedPlatform !== 'all') {
      filtered = filtered.filter((p) => p.platform === selectedPlatform);
    }

    setFilteredProducts(filtered);
  };

  const platforms = ['all', ...new Set(allProducts.map((p) => p.platform))];

  return (
    <div className="min-h-screen py-12" data-testid="products-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-white mb-4">
            Nossos Produtos
          </h1>
          <p className="text-xl text-white/60 mb-12">
            Escolha entre as melhores plataformas de streaming com preços especiais.
          </p>

          {/* Filters */}
          <div className="glass p-6 rounded-2xl border border-white/10 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-black/50 border-white/10 focus:border-primary/50 text-white h-12"
                  data-testid="search-input"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {platforms.map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedPlatform === platform
                        ? 'bg-primary text-white neon-glow'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                    data-testid={`filter-${platform}`}
                  >
                    {platform === 'all' ? 'Todos' : platform}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="text-center text-white/60 py-12">Carregando produtos...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center text-white/60 py-12" data-testid="no-products-message">
              Nenhum produto encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}