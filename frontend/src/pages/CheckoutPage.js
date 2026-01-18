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
import { Tag, Loader2, CreditCard, QrCode, Receipt } from 'lucide-react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const [productsData, setProductsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [mpInitialized, setMpInitialized] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card'); // 'credit_card', 'pix', 'boleto'

  const [customerInfo, setCustomerInfo] = useState({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    postalCode: '',
    country: 'BR',
    documentType: 'CPF',
    documentNumber: '',
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
        initMercadoPago(configRes.data.publicKey, { locale: 'pt-BR' });
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

  const validateCustomerInfo = () => {
    if (!customerInfo.email || !customerInfo.firstName || !customerInfo.lastName) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return false;
    }
    
    if ((paymentMethod === 'pix' || paymentMethod === 'boleto') && !customerInfo.documentNumber) {
      toast.error('CPF/CNPJ é obrigatório para PIX e Boleto');
      return false;
    }
    
    return true;
  };

  // Handler para pagamento com cartão (CardPayment do MP)
  const handleCardPaymentSubmit = async (formData) => {
    if (!validateCustomerInfo()) return;

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
          token: formData.token,
          installments: formData.installments || 1,
          paymentMethodId: formData.payment_method_id || formData.paymentMethodId || 'credit_card',
          issuerId: formData.issuer_id || formData.issuerId,
          transactionAmount: total,
        },
        customerInfo: {
          ...customerInfo,
          identification: {
            type: customerInfo.documentType,
            number: customerInfo.documentNumber,
          }
        },
        items: orderItems,
        subtotal,
        discount,
        total,
        couponCode: appliedCoupon?.code,
        userId: user?.id,
        sessionId: getSessionId(),
        paymentMethod: 'credit_card',
      };

      const response = await payments.process(paymentRequest);
      handlePaymentResponse(response.data);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  // Handler para PIX e Boleto
  const handleAlternativePayment = async () => {
    if (!validateCustomerInfo()) return;

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
          paymentMethodId: paymentMethod === 'pix' ? 'pix' : 'bolbradesco',
          transactionAmount: total,
        },
        customerInfo: {
          ...customerInfo,
          identification: {
            type: customerInfo.documentType,
            number: customerInfo.documentNumber,
          }
        },
        items: orderItems,
        subtotal,
        discount,
        total,
        couponCode: appliedCoupon?.code,
        userId: user?.id,
        sessionId: getSessionId(),
        paymentMethod,
      };

      const response = await payments.process(paymentRequest);
      handlePaymentResponse(response.data);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentResponse = async (responseData) => {
    if (responseData.status === 'approved') {
      await clearCart();
      navigate(`/payment-success?orderId=${responseData.orderId}`);
    } else if (responseData.status === 'pending') {
      await clearCart();
      navigate(`/payment-pending?orderId=${responseData.orderId}&method=${paymentMethod}`);
    } else if (responseData.status === 'in_process') {
      await clearCart();
      navigate(`/payment-pending?orderId=${responseData.orderId}&method=${paymentMethod}`);
    } else {
      toast.error('Pagamento não foi processado. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/60" />
      </div>
    );
  }

  if (cartItemsWithDetails.length === 0) {
    navigate('/cart');
    return null;
  }

  const paymentMethods = [
    { id: 'credit_card', name: 'Cartão de Crédito', icon: CreditCard },
    { id: 'pix', name: 'PIX', icon: QrCode },
    { id: 'boleto', name: 'Boleto', icon: Receipt },
  ];

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="text-white mb-2">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      className="bg-black/50 border-white/10 text-white h-12"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-white mb-2">Telefone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                      className="bg-black/50 border-white/10 text-white h-12"
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstName" className="text-white mb-2">Nome *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={customerInfo.firstName}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                      className="bg-black/50 border-white/10 text-white h-12"
                      placeholder="Nome"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-white mb-2">Sobrenome *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={customerInfo.lastName}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                      className="bg-black/50 border-white/10 text-white h-12"
                      placeholder="Sobrenome"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="documentNumber" className="text-white mb-2">
                      CPF/CNPJ {(paymentMethod === 'pix' || paymentMethod === 'boleto') && '*'}
                    </Label>
                    <Input
                      id="documentNumber"
                      type="text"
                      value={customerInfo.documentNumber}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, documentNumber: e.target.value.replace(/\D/g, '') })}
                      className="bg-black/50 border-white/10 text-white h-12"
                      placeholder="000.000.000-00"
                      required={paymentMethod === 'pix' || paymentMethod === 'boleto'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode" className="text-white mb-2">CEP</Label>
                    <Input
                      id="postalCode"
                      type="text"
                      value={customerInfo.postalCode}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, postalCode: e.target.value })}
                      className="bg-black/50 border-white/10 text-white h-12"
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address" className="text-white mb-2">Endereço</Label>
                    <Input
                      id="address"
                      type="text"
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                      className="bg-black/50 border-white/10 text-white h-12"
                      placeholder="Rua, número, complemento"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-white mb-2">Cidade</Label>
                    <Input
                      id="city"
                      type="text"
                      value={customerInfo.city}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                      className="bg-black/50 border-white/10 text-white h-12"
                      placeholder="Cidade"
                    />
                  </div>
                </div>
              </Card>

              {/* Payment Method Selection */}
              <Card className="glass p-8 rounded-2xl border border-white/10">
                <h2 className="text-2xl font-heading font-bold text-white mb-6">Método de Pagamento</h2>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          paymentMethod === method.id
                            ? 'border-primary bg-primary/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <Icon className={`w-8 h-8 mx-auto mb-2 ${
                          paymentMethod === method.id ? 'text-primary' : 'text-white/60'
                        }`} />
                        <p className={`text-sm ${
                          paymentMethod === method.id ? 'text-white font-semibold' : 'text-white/60'
                        }`}>
                          {method.name}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Renderização condicional baseada no método */}
                {mpInitialized && paymentMethod === 'credit_card' ? (
                  <div className="mt-6">
                    <CardPayment
                      initialization={{ amount: total }}
                      onSubmit={handleCardPaymentSubmit}
                      locale="pt-BR"
                    />
                  </div>
                ) : paymentMethod === 'pix' ? (
                  <div className="text-center py-8">
                    <QrCode className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <p className="text-white/80 mb-6">
                      Após confirmar, você receberá um QR Code PIX para realizar o pagamento
                    </p>
                    <Button
                      onClick={handleAlternativePayment}
                      disabled={processing}
                      className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-4"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Gerando PIX...
                        </>
                      ) : (
                        'Gerar QR Code PIX'
                      )}
                    </Button>
                  </div>
                ) : paymentMethod === 'boleto' ? (
                  <div className="text-center py-8">
                    <Receipt className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <p className="text-white/80 mb-6">
                      Após confirmar, você receberá o boleto para pagamento
                    </p>
                    <Button
                      onClick={handleAlternativePayment}
                      disabled={processing}
                      className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-4"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Gerando Boleto...
                        </>
                      ) : (
                        'Gerar Boleto'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-white/60">Carregando método de pagamento...</p>
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
                      <span className="flex-1">{item.product.name} x{item.quantity}</span>
                      <span className="font-semibold">{formatPrice(item.product.price * item.quantity)}</span>
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
                    <Button 
                      onClick={handleApplyCoupon} 
                      disabled={couponLoading || !!appliedCoupon} 
                      variant="outline" 
                      className="border-white/20 hover:bg-white/10 h-12 px-4"
                    >
                      {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                    </Button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-secondary text-sm">✓ Cupom aplicado: {(appliedCoupon.discount * 100).toFixed(0)}% de desconto</p>
                  )}
                </div>
                <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-white/60 text-sm text-center">🔒 Pagamento seguro processado via Mercado Pago</p>
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}