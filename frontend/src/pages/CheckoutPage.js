import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { products, coupons, payments } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { formatPrice, getSessionId } from '../lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Tag, Loader2 } from 'lucide-react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const [productsData, setProductsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [mpInitialized, setMpInitialized] = useState(false);

  const [customerInfo, setCustomerInfo] = useState({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    postalCode: '',
    country: 'BR',
  });

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, configRes] = await Promise.all([
        products.getAll(),
        payments.getConfig(),
      ]);

      setProductsData(productsRes.data);

      if (configRes.data.publicKey) {
        initMercadoPago(configRes.data.publicKey);
        setMpInitialized(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar produtos ou configuração de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    try {
      const response = await coupons.validate(couponCode);
      setAppliedCoupon(response.data);
      toast.success(`Cupom aplicado! ${(response.data.discount * 100).toFixed(0)}% de desconto`);
    } catch (error) {
      toast.error('Cupom inválido');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const getCartItemsWithDetails = () =>
    cartItems
      .map((item) => {
        const product = productsData.find((p) => p.id === item.productId);
        return { ...item, product };
      })
      .filter((item) => item.product);

  const cartItemsWithDetails = getCartItemsWithDetails();
  const subtotal = cartItemsWithDetails.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = appliedCoupon ? subtotal * appliedCoupon.discount : 0;
  const total = subtotal - discount;

  const handlePaymentSubmit = async (paymentData) => {
    if (!customerInfo.email || !customerInfo.firstName || !customerInfo.lastName) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setProcessing(true);

    try {
      const orderItems = cartItemsWithDetails.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      const paymentRequest = {
        paymentData: {
          token: paymentData.token,
          installments: paymentData.installments || 1,
          paymentMethodId: paymentData.payment_method_id,
        },
        customerInfo,
        items: orderItems,
        subtotal,
        discount,
        total,
        couponCode: appliedCoupon?.code,
        userId: user?.id,
        sessionId: getSessionId(),
      };

      const response = await payments.process(paymentRequest);

      // Redireciona de acordo com o status retornado pelo backend
      if (response.data.status === 'approved') {
        await clearCart();
        navigate(`/payment-success?orderId=${response.data.orderId}`);
      } else if (response.data.status === 'pending') {
        await clearCart();
        navigate(`/payment-pending?orderId=${response.data.orderId}`);
      } else {
        toast.error('Pagamento não foi processado. Tente novamente.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60">Carregando...</div>
      </div>
    );
  }

  if (cartItemsWithDetails.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen py-12" data-testid="checkout-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-12">Finalizar Compra</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Customer Information */}
              <Card className="glass p-8 rounded-2xl border border-white/10">
                <h2 className="text-2xl font-heading font-bold text-white mb-6">Informações de Contato</h2>
                <div className="space-y-4">
                  {/* Campos do cliente */}
                  {['email','firstName','lastName','phone','address','city','postalCode'].map((field) => (
                    <div key={field}>
                      <Label htmlFor={field} className="text-white mb-2">{field.charAt(0).toUpperCase()+field.slice(1)} *</Label>
                      <Input
                        id={field}
                        type={field === 'email' ? 'email' : 'text'}
                        value={customerInfo[field]}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, [field]: e.target.value })}
                        className="bg-black/50 border-white/10 text-white h-12"
                        placeholder={field}
                        required
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Payment Method */}
              <Card className="glass p-8 rounded-2xl border border-white/10">
                <h2 className="text-2xl font-heading font-bold text-white mb-6">Método de Pagamento</h2>

                {mpInitialized ? (
                  <CardPayment
                    initialization={{ amount: total }}
                    onSubmit={handlePaymentSubmit}
                    locale="pt-BR"
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-white/60 mb-4">Pagamentos serão processados após a confirmação</p>
                    <Button
                      onClick={() => handlePaymentSubmit({ token: 'mock_token', installments: 1, payment_method_id: 'mock' })}
                      disabled={processing}
                      className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-4"
                    >
                      {processing ? <>Processando...</> : 'Confirmar Pedido'}
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="glass p-8 rounded-2xl border border-white/10 sticky top-24">
                <h2 className="text-2xl font-heading font-bold text-white mb-6">Resumo do Pedido</h2>
                <div className="space-y-4 mb-6">
                  {cartItemsWithDetails.map((item) => (
                    <div key={item.productId} className="flex justify-between text-white/80">
                      <span>{item.product.name} x{item.quantity}</span>
                      <span>{formatPrice(item.product.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 pt-4 mb-4">
                  <div className="flex justify-between text-white/60 mb-2">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-secondary mb-2">
                      <span>Desconto ({appliedCoupon.code})</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-white/10 pt-4 mb-6">
                  <div className="flex justify-between items-baseline">
                    <span className="text-white text-lg font-bold">Total</span>
                    <span className="text-3xl font-heading font-bold text-white neon-glow">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Coupon */}
                <div className="space-y-3">
                  <Label className="text-white">Cupom de Desconto</Label>
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO"
                      className="bg-black/50 border-white/10 text-white h-12"
                      disabled={!!appliedCoupon}
                    />
                    <Button onClick={handleApplyCoupon} disabled={couponLoading || !!appliedCoupon} variant="outline" className="border-white/20 hover:bg-white/10">
                      {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                    </Button>
                  </div>
                  {appliedCoupon && <p className="text-secondary text-sm">✓ Cupom aplicado: {(appliedCoupon.discount * 100).toFixed(0)}% de desconto</p>}
                </div>
                <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-white/60 text-sm">🔒 Pagamento seguro processado via Mercado Pago</p>
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
