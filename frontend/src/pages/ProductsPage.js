import React, { useEffect, useMemo, useState } from "react";
import { products } from "../lib/api";
import ProductCard from "../components/ProductCard";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "../components/ui/input";

export default function ProductsPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("all");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const response = await products.getAll();

      if (!Array.isArray(response?.data)) {
        throw new Error("Resposta inválida da API");
      }

      setAllProducts(response.data);
    } catch (error) {
      console.error("❌ Erro ao carregar produtos:", error);

      // fallback visual
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.platform?.toLowerCase().includes(q)
      );
    }

    if (selectedPlatform !== "all") {
      filtered = filtered.filter(
        (p) => p.platform === selectedPlatform
      );
    }

    return filtered;
  }, [allProducts, searchQuery, selectedPlatform]);

  const platforms = useMemo(() => {
    return ["all", ...new Set(allProducts.map((p) => p.platform).filter(Boolean))];
  }, [allProducts]);

  return (
    <div className="min-h-screen py-16 bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-4xl sm:text-5xl font-heading font-bold mb-4">
            Nossos Produtos
          </h1>

          <p className="text-white/60 mb-12">
            Streaming premium com entrega imediata.
          </p>

          {/* Filtros */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-black/40 border-white/10 text-white"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {platforms.map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      selectedPlatform === platform
                        ? "bg-primary text-white"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {platform === "all" ? "Todos" : platform}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="text-center text-white/60 py-12">
              Carregando produtos...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center text-white/60 py-12">
              Nenhum produto encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product._id || product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
