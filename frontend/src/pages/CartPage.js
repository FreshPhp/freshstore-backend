import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { products } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart } = useCart();
  const [productsData, setProductsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await products.getAll();
      setProductsData(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCartItemsWithDetails = () => {
    return cartItems.map((item) => {
      const product = productsData.find((p) => p.id === item.productId);
      return { ...item, product };
    }).filter((item) => item.product);
  };

  const cartItemsWithDetails = getCartItemsWithDetails();
  const subtotal = cartItemsWithDetails.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60">Carregando carrinho...</div>
      </div>
    );
  }

  if (cartItemsWithDetails.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="empty-cart">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 neon-glow">
            <ShoppingBag className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-heading font-bold text-white mb-4">
            Seu carrinho está vazio
          </h2>
          <p className="text-white/60 mb-8">
            Adicione produtos incríveis ao seu carrinho para começar!
          </p>
          <Link to="/products">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 neon-glow"
              data-testid="browse-products-button"
            >
              Explorar Produtos
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12" data-testid="cart-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-12">
            Seu Carrinho
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItemsWithDetails.map((item) => (
                <motion.div
                  key={item.productId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass p-6 rounded-2xl border border-white/10"
                  data-testid={`cart-item-${item.productId}`}
                >
                  <div className="flex gap-6">
                    <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xl font-heading font-bold text-white" data-testid={`cart-item-name-${item.productId}`}>
                            {item.product.name}
                          </h3>
                          <p className="text-white/40 text-sm">{item.product.platform}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-400 hover:text-red-300"
                          data-testid={`remove-item-${item.productId}`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-8 h-8 rounded-full border-white/20"
                            data-testid={`decrease-quantity-${item.productId}`}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="text-white font-bold w-8 text-center" data-testid={`quantity-${item.productId}`}>
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-8 h-8 rounded-full border-white/20"
                            data-testid={`increase-quantity-${item.productId}`}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-heading font-bold text-white neon-glow" data-testid={`item-total-${item.productId}`}>
                            {formatPrice(item.product.price * item.quantity)}
                          </div>
                          <div className="text-white/40 text-sm">
                            {formatPrice(item.product.price)} cada
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass p-8 rounded-2xl border border-white/10 sticky top-24"
              >
                <h2 className="text-2xl font-heading font-bold text-white mb-6">
                  Resumo do Pedido
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-white/60">
                    <span>Subtotal</span>
                    <span data-testid="cart-subtotal">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Taxa de processamento</span>
                    <span className="text-secondary">Grátis</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 mb-6">
                  <div className="flex justify-between items-baseline">
                    <span className="text-white text-lg font-bold">Total</span>
                    <span className="text-3xl font-heading font-bold text-white neon-glow" data-testid="cart-total">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-full py-6 text-lg font-bold neon-glow-strong shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_40px_rgba(124,58,237,0.7)] transition-all duration-300 mb-4"
                  data-testid="checkout-button"
                >
                  Finalizar Compra
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>

                <Link to="/products">
                  <Button
                    variant="outline"
                    className="w-full border-white/20 hover:bg-white/10 text-white rounded-full"
                    data-testid="continue-shopping-button"
                  >
                    Continuar Comprando
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
