import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { products } from '../lib/api';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { ShoppingCart, Check, ArrowLeft } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { motion } from 'framer-motion';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await products.getById(id);
      setProduct(response.data);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, 1);
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60">Carregando...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60">Produto não encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12" data-testid="product-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/products')}
          className="mb-8 text-white/60 hover:text-white"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Produtos
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12"
        >
          {/* Image */}
          <div className="relative rounded-3xl overflow-hidden aspect-video glass border border-white/10">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute top-6 left-6">
              <span className="inline-block px-4 py-2 bg-primary/90 text-white text-sm font-bold rounded-full backdrop-blur-sm neon-glow">
                {product.platform}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4" data-testid="product-title">
              {product.name}
            </h1>
            <p className="text-xl text-white/60 mb-8">{product.description}</p>

            <div className="glass p-8 rounded-2xl border border-white/10 mb-8">
              <div className="flex items-baseline mb-6">
                <span className="text-5xl font-heading font-bold text-white neon-glow" data-testid="product-price">
                  {formatPrice(product.price)}
                </span>
                <span className="text-white/40 ml-3">/ {product.duration}</span>
              </div>

              <div className="space-y-3 mb-8">
                <h3 className="text-white font-heading font-bold mb-4">Inclui:</h3>
                {product.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <Check className="w-5 h-5 text-secondary mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-white/80">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleAddToCart}
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-full py-6 text-lg font-bold neon-glow-strong shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_40px_rgba(124,58,237,0.7)] transition-all duration-300"
                data-testid="add-to-cart-button"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Adicionar ao Carrinho
              </Button>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/10">
              <h3 className="text-white font-heading font-bold mb-4">Garantias</h3>
              <ul className="space-y-2 text-white/60 text-sm">
                <li>• Entrega instantânea após confirmação</li>
                <li>• Pagamento 100% seguro</li>
                <li>• Suporte 24/7</li>
                <li>• Satisfação garantida</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}