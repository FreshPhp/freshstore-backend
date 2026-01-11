import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "../components/ui/button";
import ProductCard from "../components/ProductCard";
import { products } from "../lib/api";

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const response = await products.getAll();

      if (!response?.data || !Array.isArray(response.data)) {
        throw new Error("Resposta inválida da API");
      }

      setFeaturedProducts(response.data.slice(0, 3));
    } catch (error) {
      console.error("❌ Erro ao carregar produtos:", error);

      // Fallback para não quebrar layout
      setFeaturedProducts([
        {
          id: 1,
          name: "Netflix Premium",
          description: "Acesso completo em 4K",
          price: 29.9,
        },
        {
          id: 2,
          name: "Spotify Premium",
          description: "Música sem anúncios",
          price: 19.9,
        },
        {
          id: 3,
          name: "Disney+",
          description: "Filmes e séries exclusivos",
          price: 24.9,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* imagem otimizada */}
        <img
          src="https://images.unsplash.com/photo-1760385737558-41fd105bacf0?auto=format&fit=crop&w=1600&q=80"
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.15)_0%,transparent_70%)]" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-heading font-black text-white mb-6">
              Vendas
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                Sem Limites
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-white/80 mb-12 max-w-3xl mx-auto">
              Netflix, Spotify, Disney+ e muito mais com entrega instantânea.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/products">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 rounded-full px-12 py-8 text-lg font-bold transition-all"
                >
                  Explorar Produtos
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>

              <a href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-12 py-8 text-lg"
                >
                  Saiba Mais
                </Button>
              </a>
            </div>

            <div className="mt-16 flex flex-wrap justify-center gap-8 text-white/70">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <span>Pagamento Seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span>Entrega Instantânea</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span>Qualidade Premium</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-4">
              Por que escolher a FreshStore?
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Segurança, rapidez e qualidade premium.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[Shield, Zap, Sparkles].map((Icon, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl border border-white/10 hover:border-primary/50 transition-all bg-white/5 backdrop-blur"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-heading font-bold mb-4">
                  {i === 0 && "100% Seguro"}
                  {i === 1 && "Entrega Instantânea"}
                  {i === 2 && "Suporte 24/7"}
                </h3>
                <p className="text-white/60">
                  Experiência profissional e confiável.
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUTOS */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-4">
              Produtos em Destaque
            </h2>
            <p className="text-white/60">
              Ofertas mais populares do momento
            </p>
          </div>

          {loading ? (
            <div className="text-center text-white/60">
              Carregando produtos...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="text-center mt-12">
                <Link to="/products">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full px-8"
                  >
                    Ver Todos os Produtos
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
