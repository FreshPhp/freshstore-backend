import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orders } from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Package, Calendar, CreditCard, ShoppingBag } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userOrders, setUserOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    try {
      const response = await orders.getAll();
      setUserOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'text-secondary';
      case 'pending':
        return 'text-accent';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-white/60';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'pending':
        return 'Pendente';
      case 'failed':
        return 'Falhou';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12" data-testid="dashboard-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">
              Meus Pedidos
            </h1>
            <p className="text-xl text-white/60">
              Bem-vindo de volta, {user?.firstName}!
            </p>
          </div>

          {userOrders.length === 0 ? (
            <Card className="glass p-12 rounded-2xl border border-white/10 text-center" data-testid="no-orders-message">
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 neon-glow">
                <ShoppingBag className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-white mb-4">
                Nenhum pedido ainda
              </h2>
              <p className="text-white/60 mb-8">
                Comece a explorar nossos produtos incríveis!
              </p>
              <Button
                onClick={() => navigate('/products')}
                className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 neon-glow"
                data-testid="browse-products-button"
              >
                Explorar Produtos
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {userOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass p-8 rounded-2xl border border-white/10 hover:border-primary/50 transition-colors duration-300" data-testid={`order-card-${order.id}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <Package className="w-6 h-6 text-primary" />
                          <h3 className="text-xl font-heading font-bold text-white" data-testid="order-number">
                            Pedido #{order.id.slice(0, 8)}
                          </h3>
                          <span className={`text-sm font-bold ${getStatusColor(order.status)}`} data-testid="order-status">
                            {getStatusLabel(order.status)}
                          </span>
                        </div>

                        <div className="space-y-2 text-white/60 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            <span>Mercado Pago</span>
                          </div>
                        </div>

                        <div className="mt-4 space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="text-white/80 text-sm">
                              {item.name} x{item.quantity}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-4">
                        <div className="text-right">
                          <div className="text-sm text-white/40 mb-1">Total</div>
                          <div className="text-3xl font-heading font-bold text-white neon-glow" data-testid="order-total">
                            {formatPrice(order.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}