import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos de timeout
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log detalhado de erros para debug
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      console.error('API No Response:', error.request);
    } else {
      console.error('API Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Authentication endpoints
export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// Products endpoints
export const products = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  search: (query) => api.get(`/products/search?q=${encodeURIComponent(query)}`),
  getByCategory: (category) => api.get(`/products/category/${category}`),
};

// Cart endpoints
export const cart = {
  get: (sessionId) => api.get(`/cart/${sessionId}`),
  update: (sessionId, items) => api.post(`/cart/${sessionId}`, items),
  clear: (sessionId) => api.delete(`/cart/${sessionId}`),
  addItem: (sessionId, item) => api.post(`/cart/${sessionId}/add`, item),
  removeItem: (sessionId, productId) => api.delete(`/cart/${sessionId}/item/${productId}`),
  updateQuantity: (sessionId, productId, quantity) => 
    api.patch(`/cart/${sessionId}/item/${productId}`, { quantity }),
};

// Coupons endpoints
export const coupons = {
  validate: (code) => api.get(`/coupons/validate/${code}`),
  getAll: () => api.get('/coupons'),
};

// Orders endpoints
export const orders = {
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  getByUserId: (userId) => api.get(`/orders/user/${userId}`),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
};

// Payments endpoints - MELHORADO
export const payments = {
  // Processar pagamento (cartão, PIX, boleto)
  process: (data) => api.post('/payments/process', data),
  
  // Obter configuração do Mercado Pago (public key)
  getConfig: () => api.get('/payments/config'),
  
  // Verificar status de um pagamento
  getStatus: (paymentId) => api.get(`/payments/status/${paymentId}`),
  
  // Processar pagamento com cartão
  processCard: (data) => api.post('/payments/card', {
    ...data,
    paymentMethod: 'credit_card'
  }),
  
  // Gerar QR Code PIX
  generatePix: (data) => api.post('/payments/pix', {
    ...data,
    paymentMethod: 'pix'
  }),
  
  // Gerar Boleto
  generateBoleto: (data) => api.post('/payments/boleto', {
    ...data,
    paymentMethod: 'boleto'
  }),
  
  // Webhook para notificações do Mercado Pago
  webhook: (data) => api.post('/payments/webhook', data),
  
  // Consultar pagamento por orderId
  getByOrderId: (orderId) => api.get(`/payments/order/${orderId}`),
  
  // Reprocessar pagamento falho
  retry: (paymentId) => api.post(`/payments/${paymentId}/retry`),
  
  // Cancelar pagamento pendente
  cancel: (paymentId) => api.post(`/payments/${paymentId}/cancel`),
};

// Seed endpoints
export const seed = {
  run: () => api.post('/seed'),
  reset: () => api.post('/seed/reset'),
};

// Webhook endpoints (para receber notificações do MP)
export const webhooks = {
  mercadopago: (data) => api.post('/webhooks/mercadopago', data),
};

// Health check
export const health = {
  check: () => api.get('/health'),
};

// Utility function para criar session ID se não existir
export const getOrCreateSessionId = () => {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

// Utility function para formatar erros de API
export const formatApiError = (error) => {
  if (error.response) {
    // Erro com resposta do servidor
    return {
      message: error.response.data?.message || 'Erro ao processar requisição',
      status: error.response.status,
      details: error.response.data?.details || null,
    };
  } else if (error.request) {
    // Erro sem resposta (timeout, rede, etc)
    return {
      message: 'Erro de conexão. Verifique sua internet.',
      status: 0,
      details: null,
    };
  } else {
    // Erro na configuração da requisição
    return {
      message: error.message || 'Erro desconhecido',
      status: 0,
      details: null,
    };
  }
};

export default api;