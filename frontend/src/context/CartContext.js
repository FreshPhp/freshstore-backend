import React, { createContext, useContext, useState, useEffect } from 'react';
import { cart as cartApi } from '../lib/api';
import { getSessionId } from '../lib/utils';
import { toast } from 'sonner';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const sessionId = getSessionId();
      const response = await cartApi.get(sessionId);
      setCartItems(response.data.items || []);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product, quantity = 1) => {
    try {
      const existingItem = cartItems.find(item => item.productId === product.id);
      let newItems;
      
      if (existingItem) {
        newItems = cartItems.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        newItems = [...cartItems, { productId: product.id, quantity }];
      }

      const sessionId = getSessionId();
      await cartApi.update(sessionId, newItems);
      setCartItems(newItems);
      toast.success('Produto adicionado ao carrinho!');
    } catch (error) {
      toast.error('Erro ao adicionar produto');
      console.error('Error adding to cart:', error);
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const newItems = cartItems.filter(item => item.productId !== productId);
      const sessionId = getSessionId();
      await cartApi.update(sessionId, newItems);
      setCartItems(newItems);
      toast.success('Produto removido do carrinho');
    } catch (error) {
      toast.error('Erro ao remover produto');
      console.error('Error removing from cart:', error);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      if (quantity <= 0) {
        await removeFromCart(productId);
        return;
      }

      const newItems = cartItems.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      );
      const sessionId = getSessionId();
      await cartApi.update(sessionId, newItems);
      setCartItems(newItems);
    } catch (error) {
      toast.error('Erro ao atualizar quantidade');
      console.error('Error updating quantity:', error);
    }
  };

  const clearCart = async () => {
    try {
      const sessionId = getSessionId();
      await cartApi.update(sessionId, []);
      setCartItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount,
      loading
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}