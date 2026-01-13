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
import CheckoutButton from "../components/CheckoutButton";
import { processPayment } from "../lib/api"; // seu endpoint /payments/process



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

  const [paymentAmount] = useState(() => total);


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

 }

 return (
  <div className="min-h-screen py-12" data-testid="checkout-page">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* ✅ MOTION SÓ NO TÍTULO / LAYOUT */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-12">
          Finalizar Compra
        </h1>
      </motion.div>

      {/* ❌ FORA DO MOTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* FORMULÁRIO */}
        <div className="lg:col-span-2 space-y-8">

          {/* Customer Information */}
          <Card className="glass p-8 rounded-2xl border border-white/10">
            <h2 className="text-2xl font-heading font-bold text-white mb-6">
              Informações de Contato
            </h2>

            <div className="space-y-4">
              {['email','firstName','lastName','phone','address','city','postalCode'].map(field => (
                <div key={field}>
                  <Label className="text-white mb-2">
                    {field}
                  </Label>
                  <Input
                    value={customerInfo[field]}
                    onChange={e =>
                      setCustomerInfo({ ...customerInfo, [field]: e.target.value })
                    }
                    className="bg-black/50 border-white/10 text-white h-12"
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* 🔒 PAGAMENTO SEM MOTION */}
          <Card className="glass p-8 rounded-2xl border border-white/10">
            <h2 className="text-2xl font-heading font-bold text-white mb-6">
              Método de Pagamento
            </h2>

            {mpInitialized && (
              <div id="mp-card-wrapper">
                <CardPayment
                  initialization={{ amount: paymentAmount }}
                  onSubmit={handlePaymentSubmit}
                  locale="pt-BR"
                />
              </div>
            )}
          </Card>
        </div>

        {/* RESUMO */}
        <div className="lg:col-span-1">
          {/* resumo permanece igual */}
        </div>

      </div>
    </div>
  </div>
);
