import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { StoreView } from './components/StoreView';
import { LandingPageDetailView } from './components/LandingPageDetailView';
import { ContactView } from './components/ContactView';
import { OrdersAdminView } from './components/OrdersAdminView';
import { LandingPagesAdminView } from './components/LandingPagesAdminView';
import { LandingPageAdminBar } from './components/LandingPageAdminBar';
import { GoogleSheetsConfigModal } from './components/GoogleSheetsConfigModal';
import { Product, ViewMode } from './types';
import { getSavedOrders } from './utils/orderStorage';
import { getSavedProducts, fetchProductsFromFirestore } from './utils/productStorage';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(getSavedProducts());
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  
  const [isSheetsConfigOpen, setIsSheetsConfigOpen] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);

  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return localStorage.getItem('oryx_admin_mode') === 'true';
  });

  useEffect(() => {
    const productIdFromUrl = new URLSearchParams(window.location.search).get('product');
    const initialView: ViewMode = productIdFromUrl ? 'landing-detail' : 'home';
    const initialState = window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {};
    window.history.replaceState(
      { ...initialState, oryxStore: true, view: initialView, productId: productIdFromUrl },
      '',
      window.location.href
    );
    setCurrentView(initialView);
    setSelectedProductId(productIdFromUrl);

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (!state?.oryxStore || !state.view) return;

      setCurrentView(state.view as ViewMode);
      setSelectedProductId(state.productId ?? null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleAdminMode = () => {
    const next = !isAdminMode;
    setIsAdminMode(next);
    localStorage.setItem('oryx_admin_mode', String(next));
  };

  useEffect(() => {
    updateOrdersCount();
    fetchProductsFromFirestore().then(cloudProducts => {
      if (cloudProducts && cloudProducts.length > 0) {
        setProducts([...cloudProducts]);
      }
    }).finally(() => setIsProductsLoading(false));
  }, []);

  const updateOrdersCount = () => {
    const orders = getSavedOrders();
    setOrdersCount(orders.length);
  };

  const refreshProducts = () => {
    setProducts([...getSavedProducts()]);
  };

  const handleOpenOrderModal = (product: Product) => {
    setSelectedProductId(product.id);
    handleViewChange('landing-detail', product.id);
  };

  const handleViewChange = (view: ViewMode, id?: string) => {
    const productId = view === 'landing-detail' ? id ?? selectedProductId : null;
    const currentState = window.history.state;
    const nextUrl = new URL(window.location.href);
    if (productId) {
      nextUrl.searchParams.set('product', productId);
    } else {
      nextUrl.searchParams.delete('product');
    }

    if (!currentState?.oryxStore || currentState.view !== view || currentState.productId !== productId || window.location.href !== nextUrl.href) {
      window.history.pushState(
        { oryxStore: true, view, productId },
        '',
        `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
      );
    }

    setSelectedProductId(productId);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (window.history.state?.oryxStore) {
      window.history.back();
      return;
    }
    handleViewChange('store');
  };

  const currentProducts = products;
  const activeProduct = selectedProductId
    ? currentProducts.find(p => p.id === selectedProductId)
    : currentProducts[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white" dir="rtl">
      
      {/* Admin Top Bar Above Header - Only visible to admin when enabled */}
      {isAdminMode && (
        <LandingPageAdminBar
          onNavigate={handleViewChange}
          onProductsChange={refreshProducts}
          onOpenSheetsConfig={() => setIsSheetsConfigOpen(true)}
        />
      )}

      <Header
        currentView={currentView}
        onViewChange={(v) => handleViewChange(v)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomeView
            products={currentProducts}
            isProductsLoading={isProductsLoading}
            onOrderClick={handleOpenOrderModal}
            onViewChange={(view, id) => handleViewChange(view, id)}
          />
        )}

        {currentView === 'store' && (
          <StoreView
            products={currentProducts}
            onOrderClick={handleOpenOrderModal}
          />
        )}

        {currentView === 'landing-detail' && activeProduct && (
          <LandingPageDetailView
            product={activeProduct}
            onBack={handleBack}
            onRelatedProductSelect={(productId) => handleViewChange('landing-detail', productId)}
            onOrderSuccess={updateOrdersCount}
          />
        )}

        {currentView === 'landing-detail' && !activeProduct && (
          <div className="mx-auto max-w-2xl px-4 py-24 text-center">
            {isProductsLoading ? (
              <p className="font-bold text-slate-600">جاري تحميل المنتج...</p>
            ) : (
              <>
                <h2 className="mb-4 text-xl font-black text-slate-900">لم يتم العثور على هذا المنتج</h2>
                <button
                  type="button"
                  onClick={() => handleViewChange('store')}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  العودة إلى المتجر
                </button>
              </>
            )}
          </div>
        )}

        {currentView === 'contact' && (
          <ContactView />
        )}

        {currentView === 'admin-orders' && (
          <OrdersAdminView onNavigate={handleViewChange} />
        )}

        {currentView === 'admin-products' && (
          <LandingPagesAdminView onNavigate={handleViewChange} />
        )}
      </main>

      {/* Footer - Hidden on landing-detail view */}
      {currentView !== 'landing-detail' && (
        <Footer
          onViewChange={(v) => handleViewChange(v)}
          onSecretAdminClick={toggleAdminMode}
        />
      )}

      {/* Google Sheets Config Modal */}
      <GoogleSheetsConfigModal
        isOpen={isSheetsConfigOpen}
        onClose={() => setIsSheetsConfigOpen(false)}
      />

    </div>
  );
}
