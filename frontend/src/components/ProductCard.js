import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ShoppingCart, Check } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  return (
    <Card
      className="group relative overflow-hidden rounded-2xl bg-card border border-white/5 hover:border-primary/50 transition-all duration-500 cursor-pointer"
      onClick={() => navigate(`/products/${product.id}`)}
      data-testid={`product-card-${product.id}`}
    >
      <div className="aspect-video relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
          <span className="inline-block px-3 py-1 bg-primary/80 text-white text-xs rounded-full backdrop-blur-sm">
            {product.platform}
          </span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-heading font-bold text-white mb-2" data-testid="product-name">
          {product.name}
        </h3>
        <p className="text-white/60 text-sm mb-4 line-clamp-2">
          {product.description}
        </p>

        <div className="space-y-2 mb-4">
          {product.features.slice(0, 2).map((feature, index) => (
            <div key={index} className="flex items-center text-secondary text-sm">
              <Check className="w-4 h-4 mr-2" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div>
            <div className="text-2xl font-heading font-bold text-white neon-glow" data-testid="product-price">
              {formatPrice(product.price)}
            </div>
            <div className="text-white/40 text-xs">{product.duration}</div>
          </div>

          <Button
            onClick={handleAddToCart}
            className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 neon-glow transition-all duration-300"
            data-testid={`add-to-cart-${product.id}`}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>
    </Card>
  );
}