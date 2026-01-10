import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { orders } from '../lib/api';
import { Button } from '../components/ui/button';
import { CheckCircle2, Package } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { motion } from 'framer-motion';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const response = await orders.getById(orderId);
      setOrder(response.data);
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" data-testid="payment-success-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full glass p-12 rounded-3xl border border-white/10 text-center"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center justify-center mx-auto mb-6 neon-glow animate-glow-pulse">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-4xl font-heading font-bold text-white mb-4">
          Pagamento Aprovado!
        </h1>
        <p className="text-xl text-white/60 mb-8">
          Seu pedido foi confirmado e as credenciais serão enviadas para seu email em instantes.
        </p>

        {!loading && order && (
          <div className="glass p-6 rounded-2xl border border-white/10 mb-8 text-left">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-heading font-bold text-white">
                Detalhes do Pedido
              </h2>
            </div>

            <div className="space-y-2 text-white/80">
              <div className="flex justify-between">
                <span>Pedido:</span>
                <span className="font-mono text-sm" data-testid="order-id">#{order.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-bold text-secondary" data-testid="order-total">{formatPrice(order.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-secondary font-bold" data-testid="order-status">Aprovado</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/dashboard">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 neon-glow"
              data-testid="view-orders-button"
            >
              Ver Meus Pedidos
            </Button>
          </Link>
          <Link to="/products">
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 hover:bg-white/10 text-white rounded-full px-8"
              data-testid="continue-shopping-button"
            >
              Continuar Comprando
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}