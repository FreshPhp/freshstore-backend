import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="glass border-t border-white/5 mt-24" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center neon-glow">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-xl font-heading font-bold text-white">StreamShop</span>
            </div>
            <p className="text-white/60 text-sm">
              A melhor loja de contas de streaming com preços acessíveis e atendimento de qualidade.
            </p>
          </div>

          <div>
            <h3 className="text-white font-heading font-bold mb-4">Produtos</h3>
            <ul className="space-y-2 text-white/60 text-sm">
              <li><Link to="/products" className="hover:text-white transition-colors">Netflix</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Spotify</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Disney+</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">HBO Max</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-heading font-bold mb-4">Suporte</h3>
            <ul className="space-y-2 text-white/60 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-heading font-bold mb-4">Pagamento Seguro</h3>
            <p className="text-white/60 text-sm mb-4">
              Pagamentos processados com segurança via Mercado Pago.
            </p>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-2 bg-white/5 rounded text-xs text-white/80 border border-white/10">
                🔒 SSL Secure
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 mt-8 pt-8 text-center text-white/40 text-sm">
          <p>© 2025 StreamShop. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}