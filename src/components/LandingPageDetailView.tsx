import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, Truck, Phone, User, Building2, Play, Video, Star, CreditCard, ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { Product } from '../types';
import { getProductReviews } from '../utils/productReviews';
import { createProductSnapshot, saveOrder } from '../utils/orderStorage';
import { getSavedProducts, updateProductAsync } from '../utils/productStorage';
import { getVideoBlobUrl } from '../utils/videoDb';

const isSaudiPhone = (phone: string) => /^(?:05\d{8}|0(?:11|12|13|14|16|17)\d{7})$/.test(phone);

const rotateProducts = (products: Product[], seed: string): Product[] => {
  if (products.length < 2) return products;
  const hash = [...seed].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
  const offset = hash % products.length;
  return [...products.slice(offset), ...products.slice(0, offset)];
};

interface LandingPageDetailViewProps {
  product: Product;
  onBack: () => void;
  onRelatedProductSelect: (productId: string) => void;
  onOrderSuccess: () => void;
}

export const LandingPageDetailView: React.FC<LandingPageDetailViewProps> = ({
  product,
  onBack,
  onRelatedProductSelect,
  onOrderSuccess,
}) => {
  const [customerReviews, setCustomerReviews] = useState(() => getProductReviews(product));
  const [reviewName, setReviewName] = useState('');
  const [reviewCity, setReviewCity] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const reviewStats = customerReviews.length > 0
    ? {
        rating: customerReviews.reduce((total, review) => total + review.rating, 0) / customerReviews.length,
        reviewsCount: customerReviews.length
      }
    : null;
  const displayedReviews = customerReviews.slice(0, 3);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [createdOrderCode, setCreatedOrderCode] = useState('');

  // Bundle selection state (default to first bundle if exists)
  const [selectedBundleIndex, setSelectedBundleIndex] = useState<number | null>(
    product.bundles && product.bundles.length > 0 ? 0 : null
  );

  // Auto-update quantity when bundle index changes
  useEffect(() => {
    if (selectedBundleIndex !== null && product.bundles && product.bundles[selectedBundleIndex]) {
      setQuantity(product.bundles[selectedBundleIndex].quantity);
    }
  }, [selectedBundleIndex, product.bundles]);

  // Image gallery state
  const allImages = [product.image, ...(product.images || [])].filter(Boolean);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [showVideoActive, setShowVideoActive] = useState(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);

  const showPreviousImage = () => {
    setActiveImageIndex((currentIndex) => (currentIndex - 1 + allImages.length) % allImages.length);
  };
  const showNextImage = () => {
    setActiveImageIndex((currentIndex) => (currentIndex + 1) % allImages.length);
  };

  useEffect(() => {
    if (!isImageViewerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsImageViewerOpen(false);
      if (event.key === 'ArrowLeft') showPreviousImage();
      if (event.key === 'ArrowRight') showNextImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageViewerOpen, allImages.length]);

  useEffect(() => {
    async function loadVideo() {
      if (product.videoUrl) {
        if (product.videoUrl.startsWith('blob-db:')) {
          const url = await getVideoBlobUrl(product.videoUrl);
          setResolvedVideoUrl(url);
        } else {
          setResolvedVideoUrl(product.videoUrl);
        }
      } else {
        setResolvedVideoUrl(null);
      }
    }
    loadVideo();
  }, [product.videoUrl]);

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1&mute=1&loop=1&playlist=${match[2]}`;
    }
    return url;
  };

  useEffect(() => {
    setActiveImageIndex(0);
    setShowVideoActive(false);
    setCustomerReviews(getProductReviews(product));
    setReviewSubmitted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (product.bundles && product.bundles.length > 0) {
      setSelectedBundleIndex(0);
      setQuantity(product.bundles[0].quantity);
    } else {
      setSelectedBundleIndex(null);
      setQuantity(1);
    }
  }, [product.id]);

  const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newReview = {
      name: reviewName.trim(),
      city: reviewCity.trim() || 'عميل من المملكة',
      comment: reviewComment.trim(),
      rating: reviewRating,
      date: new Date().toLocaleDateString('ar-SA')
    };
    const updatedProduct = {
      ...product,
      reviews: [...(product.reviews || []), newReview]
    };

    await updateProductAsync(updatedProduct);
    setCustomerReviews(getProductReviews(updatedProduct));
    setReviewName('');
    setReviewCity('');
    setReviewComment('');
    setReviewRating(5);
    setReviewSubmitted(true);
  };

  const totalPrice = selectedBundleIndex !== null && product.bundles && product.bundles[selectedBundleIndex]
    ? product.bundles[selectedBundleIndex].totalPrice
    : product.price * quantity;
  const cleanPhone = phone.replace(/\D/g, '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      alert('يرجى إدخال اسمك الكامل بشكل صحيح.');
      return;
    }
    if (!isSaudiPhone(cleanPhone)) {
      alert('أدخل رقمًا سعوديًا صحيحًا: جوال يبدأ بـ 05 أو هاتف ثابت يبدأ بـ 011 أو 012 أو 013 أو 014 أو 016 أو 017.');
      return;
    }
    if (!city.trim() || city.trim().length < 2) {
      alert('يرجى إدخال المحافظة أو العنوان الكامل بالمملكة.');
      return;
    }
    const orderQuantity = selectedBundleIndex !== null && product.bundles && product.bundles[selectedBundleIndex]
      ? product.bundles[selectedBundleIndex].quantity
      : quantity;

    const savedPrice = selectedBundleIndex !== null && product.bundles && product.bundles[selectedBundleIndex]
      ? Math.round(product.bundles[selectedBundleIndex].totalPrice / product.bundles[selectedBundleIndex].quantity)
      : product.price;

    const offerNotes = selectedBundleIndex !== null && product.bundles && product.bundles[selectedBundleIndex]
      ? `طلب عرض خاص: ${product.bundles[selectedBundleIndex].label}`
      : `طلب عادي عبر صفحة الهبوط: ${product.title}`;

    const saved = saveOrder({
      productId: product.id,
      productTitle: product.title,
      productSnapshot: createProductSnapshot(product),
      price: savedPrice,
      quantity: orderQuantity,
      fullName: fullName.trim(),
      phone: cleanPhone,
      city: city.trim(),
      address: city.trim(),
      notes: offerNotes
    });

    setCreatedOrderCode(saved.id);
    setSubmitted(true);
    onOrderSuccess();

    if (typeof (window as any).confetti === 'function') {
      (window as any).confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

  };

  const candidates = [...new Map(
    getSavedProducts().filter((savedProduct) => savedProduct.id !== product.id)
      .map((savedProduct) => [savedProduct.id, savedProduct])
  ).values()];
  const currentCategory = product.category.trim().toLocaleLowerCase();
  const sameCategory = currentCategory
    ? candidates.filter((candidate) => candidate.category.trim().toLocaleLowerCase() === currentCategory)
    : [];
  const otherCategories = candidates.filter((candidate) => !sameCategory.includes(candidate));
  const relatedProducts = [
    ...rotateProducts(sameCategory, product.id),
    ...rotateProducts(otherCategories, `${product.id}:other`)
  ].slice(0, 3);
  const badgeText = product.badge || '🔥 عرض محدود - توصيل مجاني';
  const headline = product.heroHeadline || product.title;
  const subtext = product.heroSubtext || product.description;
  const relatedProductsSection = relatedProducts.length > 0 && (
    <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
      <div className="space-y-1 border-b border-slate-100 pb-2 text-right">
        <h4 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
          🛍️ <span>منتجات أخرى قد تنال إعجابك</span>
        </h4>
        <p className="text-sm text-slate-600 font-semibold">تخفيضات حصرية مع التوصيل المجاني والدفع بعد المعاينة</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {relatedProducts.map((rel) => (
          <article key={rel.id} className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col justify-between group hover:border-emerald-400 transition-colors text-right">
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => onRelatedProductSelect(rel.id)}
                aria-label={`شاهد المنتج: ${rel.title}`}
                className="relative block aspect-square w-full rounded-md overflow-hidden bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <img src={rel.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
              </button>
              <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                <button
                  type="button"
                  onClick={() => onRelatedProductSelect(rel.id)}
                  className="text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                >
                  {rel.title}
                </button>
              </h5>
            </div>

            <div className="pt-1.5 mt-1 border-t border-slate-200 flex items-center justify-between gap-1">
              <span className="text-sm sm:text-base font-black text-emerald-700 whitespace-nowrap">
                {rel.price} ر.س
              </span>
              <button
                type="button"
                onClick={() => onRelatedProductSelect(rel.id)}
                className="min-h-9 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-colors shrink-0"
              >
                شاهد المنتج
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 animate-fadeIn" dir="rtl">
      
      {/* 1. Top Announcement Bar */}
      <div className="overflow-hidden border-b border-amber-400/20 bg-slate-900 py-2.5 text-sm font-bold text-amber-300 shadow-xs" dir="ltr">
        <div className="announcement-marquee-track inline-flex w-max">
          <div className="announcement-marquee-group inline-flex shrink-0 items-center gap-80 whitespace-nowrap pe-80" dir="ltr">
            <span dir="rtl">🚚 توصيل مجاني لجميع محافظات المملكة</span>
            <span dir="rtl">💵 الدفع عند الاستلام بعد معاينة طلبك</span>
            <span dir="rtl">⚡ طلبك يوصلك لباب البيت بسرعة وأمان</span>
          </div>
          <div className="announcement-marquee-group inline-flex shrink-0 items-center gap-80 whitespace-nowrap pe-80" dir="ltr" aria-hidden="true">
            <span dir="rtl">🚚 توصيل مجاني لجميع محافظات المملكة</span>
            <span dir="rtl">💵 الدفع عند الاستلام بعد معاينة طلبك</span>
            <span dir="rtl">⚡ طلبك يوصلك لباب البيت بسرعة وأمان</span>
          </div>
        </div>
      </div>

      {/* 3. Main Container */}
      <main className="max-w-[1440px] mx-auto flex-1 px-4 sm:px-6 pt-5 sm:pt-6 space-y-5">
        {(() => {
          const badgeText = product.badge || '🔥 عرض خاص - توصيل مجاني';
          const headline = product.heroHeadline || product.title;
          const subtext = product.heroSubtext || product.description;

          const gallerySection = (
            <div className="relative w-full bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2.5 lg:flex-row-reverse lg:items-stretch lg:gap-3">
              <div className={`relative w-full lg:flex-1 lg:min-w-0 ${showVideoActive && resolvedVideoUrl ? 'aspect-video max-h-[70vh] lg:max-h-[460px]' : 'aspect-[4/3] lg:h-[min(54vh,460px)]'} bg-slate-50 rounded-lg overflow-hidden border border-slate-200 mx-auto`}>
                {showVideoActive && resolvedVideoUrl ? (
                  product.videoUrl?.includes('youtube.com') || product.videoUrl?.includes('youtu.be') ? (
                    <iframe
                      src={getYouTubeEmbedUrl(product.videoUrl)}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <video
                      src={resolvedVideoUrl}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-contain"
                    ></video>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsImageViewerOpen(true)}
                    aria-label="افتح صورة المنتج بالحجم الكامل"
                    className="group block w-full h-full cursor-zoom-in"
                  >
                    <img
                      src={allImages[activeImageIndex] || product.image}
                      alt={product.title}
                      className="block w-full h-full object-contain object-center"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-950/80 px-3 py-2 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <ZoomIn className="h-4 w-4" /> عرض تفاصيل العرض والصور
                    </span>
                  </button>
                )}

                {product.oldPrice && (
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-sm font-black px-3 py-1.5 rounded-xl shadow-md z-10">
                    تخفيض -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                  </div>
                )}

                <div className="absolute top-3 left-3 bg-slate-900/85 text-white text-xs font-bold px-2 py-0.5 rounded-xl backdrop-blur-xs z-10">
                  🛡️ أصلي 100%
                </div>
              </div>

              {/* Thumbnails */}
              {(allImages.length > 1 || product.videoUrl) && (
                <div className="flex items-center gap-2 overflow-x-auto py-1 justify-start lg:w-32 lg:shrink-0 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:max-h-[460px] lg:rounded-lg lg:bg-slate-50 lg:p-1.5">
                  {product.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setShowVideoActive(true)}
                      className={`w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-all flex flex-col items-center justify-center relative bg-slate-950 ${
                        showVideoActive ? 'border-amber-500 ring-2 ring-amber-400' : 'border-slate-200'
                      }`}
                    >
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center z-10">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                      {product.image ? (
                        <img src={product.image} alt="Video Thumbnail" className="w-full h-full object-cover opacity-65" referrerPolicy="no-referrer" />
                      ) : (
                        <Video className="w-5 h-5 text-amber-500" />
                      )}
                    </button>
                  )}

                  {allImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveImageIndex(idx);
                        setShowVideoActive(false);
                      }}
                      className={`w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                        (!showVideoActive && activeImageIndex === idx) ? 'border-emerald-600 ring-2 ring-emerald-400' : 'border-slate-200'
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain bg-white" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );

          const imageViewer = isImageViewerOpen && !showVideoActive && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`صور ${product.title}`}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-6"
              onClick={() => setIsImageViewerOpen(false)}
            >
              <div className="relative flex max-h-full w-full max-w-6xl flex-col gap-3" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 text-white">
                  <div className="text-right">
                    <h2 className="text-base font-black sm:text-lg">{headline}</h2>
                    <p className="mt-1 text-sm font-semibold text-amber-300">{badgeText} · {product.price} ر.س</p>
                  </div>
                  <button type="button" onClick={() => setIsImageViewerOpen(false)} aria-label="إغلاق عرض الصور" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative flex min-h-0 flex-1 items-center justify-center">
                  <img src={allImages[activeImageIndex] || product.image} alt={`${product.title} - الصورة ${activeImageIndex + 1}`} className="max-h-[68vh] max-w-full object-contain" referrerPolicy="no-referrer" />
                  {allImages.length > 1 && <>
                    <button type="button" onClick={showPreviousImage} aria-label="الصورة السابقة" className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 sm:right-4">
                      <ChevronRight className="h-6 w-6" />
                    </button>
                    <button type="button" onClick={showNextImage} aria-label="الصورة التالية" className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 sm:left-4">
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                  </>}
                </div>

                <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                  {allImages.map((imgUrl, index) => (
                    <button key={`${imgUrl}-${index}`} type="button" onClick={() => setActiveImageIndex(index)} aria-label={`عرض الصورة ${index + 1}`} aria-current={activeImageIndex === index} className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 sm:h-16 sm:w-16 ${activeImageIndex === index ? 'border-amber-400' : 'border-white/30'}`}>
                      <img src={imgUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );

          const titleSection = (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold px-3 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                  {badgeText}
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                  ✓ متوفر بالمملكة 🇸🇦
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-950 leading-tight">
                {headline}
              </h1>

              {reviewStats && <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 pb-1.5 border-b border-slate-100">
                <span className="flex items-center gap-0.5 text-amber-500" aria-label={`${reviewStats.rating.toFixed(1)} من 5 نجوم`}>
                  {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`w-4 h-4 ${index < Math.round(reviewStats.rating) ? 'fill-current' : ''}`} />)}
                </span>
                <span className="font-extrabold text-slate-900">{reviewStats.rating.toFixed(1)}</span>
                <span className="text-slate-500 text-xs">({reviewStats.reviewsCount} تقييم)</span>
              </div>}
            </div>
          );

          const descriptionSection = (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-black text-lg sm:text-xl text-slate-950 border-b border-slate-100 pb-2">
                📝 <span>تفاصيل ومميزات المنتج:</span>
              </h3>
              <p className="text-base text-slate-700 leading-relaxed font-normal">
                {subtext}
              </p>
            </div>
          );

          const urgencyBar = (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-emerald-700" /> توصيل لجميع مناطق المملكة</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-700" /> الدفع عند الاستلام</span>
            </div>
          );

          const orderFormSection = (
            <div className="space-y-3.5">
              {/* Quantity Tiers & Bundles (عروض وباقات التوفير المميزة) */}
              {product.bundles && product.bundles.length > 0 ? (
                <div className="bg-white p-3 rounded-xl border border-emerald-300 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <label className="text-sm sm:text-base font-black text-slate-950 flex items-center gap-1.5">
                      🔥 <span>اختر العرض الخاص بك ووفر أكثر:</span>
                    </label>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      توصيل مجاني 100%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {product.bundles.map((bundle, idx) => {
                      const isSelected = selectedBundleIndex === idx;
                      const originalCombinedPrice = product.price * bundle.quantity;
                      const discount = originalCombinedPrice - bundle.totalPrice;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedBundleIndex(idx);
                          }}
                            className={`w-full text-right p-1.5 sm:p-2 rounded-lg border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50'
                              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5">
                              <span className="font-black text-sm text-slate-950 leading-tight">{bundle.label}</span>
                              <span className="text-xs text-slate-700 font-bold inline-flex flex-wrap items-center gap-x-1">
                                {bundle.quantity === 1 && product.oldPrice && (
                                  <span className="text-sm sm:text-base font-extrabold text-slate-700 line-through decoration-rose-600 decoration-2">
                                    {product.oldPrice} ر.س
                                  </span>
                                )}
                                <span>| الكمية: {bundle.quantity} {bundle.quantity === 1 ? 'قطعة' : bundle.quantity === 2 ? 'قطعتين' : 'قطع'}</span>
                              </span>
                            </div>
                          </div>

                          <div dir="ltr" className="flex shrink-0 flex-col items-start gap-0.5 sm:gap-1 text-left">
                            <span className="inline-flex flex-row-reverse items-baseline gap-1 whitespace-nowrap text-lg font-black leading-none text-emerald-700 sm:text-xl">
                              <span>{bundle.totalPrice}</span>
                              <span>ر.س</span>
                            </span>
                            {discount > 0 ? (
                              <span className="text-[11px] sm:text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 sm:px-2 py-0.5 rounded-md whitespace-nowrap">
                                وفرت {discount} ر.س!
                              </span>
                            ) : (
                              <span className="text-[11px] sm:text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 sm:px-2 py-0.5 rounded-md whitespace-nowrap">
                                أفضل سعر ومضمون
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      🛍️ <span>حدد كمية الطلب (عدد القطع):</span>
                    </label>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      توصيل مجاني 100%
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border-2 border-slate-200">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-2xs w-32">
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-8 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm cursor-pointer border-l border-slate-200 shrink-0"
                        >
                          -
                        </button>
                        <div className="flex-1 flex flex-col items-center justify-center py-0.5 min-w-0">
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full text-center font-black text-base text-slate-900 focus:outline-none bg-transparent"
                          />
                          <span className="text-xs font-medium text-slate-500 -mt-1 truncate px-1">
                            {quantity === 1 ? 'قطعة واحدة' : quantity === 2 ? 'قطعتين' : 'قطع'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-8 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm cursor-pointer border-r border-slate-200 shrink-0"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-5 h-4.5 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-700 font-bold text-xs">▲</button>
                        <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-5 h-4.5 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-700 font-bold text-xs">▼</button>
                      </div>
                    </div>

                    <div className="flex-1 bg-emerald-50/90 border-2 border-emerald-300/80 px-3 py-1.5 rounded-xl flex flex-col items-center justify-center text-center shadow-2xs">
                      <span className="text-xs text-emerald-800 font-bold block">المجموع الإجمالي:</span>
                      <div className="text-2xl font-black text-emerald-700 leading-none tracking-tight flex items-baseline justify-center gap-1 mt-0.5">
                        <span>{totalPrice}</span>
                        <span className="text-sm font-black text-emerald-600">ر.س</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Direct COD Order Form */}
              <div id="order-form-container" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
                <div className="bg-emerald-700 text-center py-3 px-4 space-y-1">
                  <h2 className="text-base sm:text-lg font-black text-white">استمارة الطلب السريع (الدفع عند الاستلام)</h2>
                  <p className="text-sm text-emerald-100 font-bold leading-relaxed">أدخل معلوماتك أدناه وسنتصل بك لتأكيد طلبك وتوصيله لباب منزلك في المملكة</p>
                </div>

                <div className="p-3.5 sm:p-4">
                  {submitted ? (
                    <div className="bg-emerald-950/95 border border-emerald-500/50 p-6 rounded-2xl text-center space-y-3 text-white">
                      <div className="w-16 h-16 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center mx-auto shadow-lg">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-black text-emerald-300">تم تسجيل طلبك بنجاح!</h3>
                      <p className="text-xs text-slate-200">
                        رقم الطلب: <span className="font-bold text-amber-400">{createdOrderCode}</span>
                      </p>
                      <p className="text-xs text-slate-300">
                        شكراً لثقتك بنا. سيتم الاتصال بك هاتفياً قريباً لتأكيد الشحن والتوصيل المجاني داخل المملكة.
                      </p>
                      <button
                        onClick={onBack}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow"
                      >
                        العودة للمتجر
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="min-w-0">
                        <label className="block text-sm font-semibold text-slate-900 mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <User className="absolute right-3 top-3 w-4 h-4 text-slate-500 z-10" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="مثال: سلطان القحطاني"
                            className="w-full pr-9 pl-3 py-2.5 rounded-xl border-2 border-slate-300 text-base leading-6 font-medium text-slate-900 placeholder:text-slate-500 placeholder:font-normal bg-slate-50/60 focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-semibold text-slate-900">رقم الهاتف <span className="text-red-500">*</span></label>
                        </div>
                        <div className="relative">
                          <Phone className="absolute right-3 top-3 w-4 h-4 text-slate-500 z-10" />
                          <input
                            type="tel"
                            required
                            dir="ltr"
                            maxLength={10}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="05XXXXXXXX أو 011XXXXXXX"
                            className="w-full pr-9 pl-3 py-2.5 rounded-xl border-2 border-slate-300 text-base leading-6 font-medium tracking-wider text-right placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-500 bg-slate-50/60 focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <label className="block text-sm font-semibold text-slate-900 mb-1">المحافظة والعنوان الكامل بالمملكة <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Building2 className="absolute right-3 top-3 w-4 h-4 text-slate-500 z-10" />
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="مثال: الرياض، جدة، الدمام، مكة المكرمة..."
                            className="w-full pr-9 pl-3 py-2.5 rounded-xl border-2 border-slate-300 text-base leading-6 font-medium text-slate-900 placeholder:text-slate-500 placeholder:font-normal bg-slate-50/60 focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-slate-700 font-extrabold text-sm">
                          <span>التوصيل والشحن:</span>
                          <span className="text-emerald-600 font-black">مجاني 100%</span>
                        </div>
                        <div className="flex items-center justify-between font-black pt-1.5 border-t border-slate-200">
                          <span className="text-slate-950 text-sm sm:text-base">المجموع الإجمالي المطلوب:</span>
                          <span className="text-base sm:text-lg font-black text-emerald-700">{totalPrice} ر.س</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full min-h-14 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base sm:text-lg rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer animate-pulse"
                      >
                        اضغط هنا لتأكيد طلبك الآن (الدفع عند الاستلام)
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Store Guarantees Highlights */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs lg:hidden">
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                  <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 p-2.5 sm:p-3 bg-emerald-50/70 rounded-lg border border-emerald-100">
                    <span className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Truck className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 text-center sm:text-right">
                      <span className="block text-xs sm:text-sm font-black text-slate-900">توصيل سريع ومجاني</span>
                      <span className="block mt-0.5 text-xs font-medium text-slate-600">لكل مناطق المملكة</span>
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 p-2.5 sm:p-3 bg-amber-50/70 rounded-lg border border-amber-100">
                    <span className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 text-center sm:text-right">
                      <span className="block text-xs sm:text-sm font-bold text-slate-900">الدفع بعد المعاينة</span>
                      <span className="block mt-0.5 text-xs font-medium text-slate-600">افحص طلبك قبل الدفع</span>
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 p-2.5 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 text-center sm:text-right">
                      <span className="block text-xs sm:text-sm font-bold text-slate-900">متجر موثوق</span>
                      <span className="block mt-0.5 text-xs font-medium text-slate-600">دعم ومتابعة لطلبك</span>
                    </span>
                  </div>
                </div>
              </div>

            </div>
          );

          return (
            <>
              {imageViewer}
              {/* ================= MOBILE LAYOUT (lg:hidden) ================= */}
              {/* Order requested: Title -> Images -> Form -> Description (Urgency bar removed on mobile) */}
              <div className="lg:hidden space-y-4">
                {titleSection}
                {gallerySection}
                {orderFormSection}
                {descriptionSection}
                {relatedProductsSection}
              </div>

              {/* ================= DESKTOP LAYOUT (hidden lg:grid) ================= */}
              <div className="hidden lg:grid grid-cols-12 gap-4 items-start">
                <div className="col-span-7 space-y-3">
                  {titleSection}
                  {gallerySection}
                  {urgencyBar}
                  {descriptionSection}
                  {relatedProductsSection}
                </div>
                <div className="col-span-5 space-y-3">
                  {orderFormSection}
                </div>
              </div>
            </>
          );
        })()}

        {/* Customer Reviews */}
        {displayedReviews.length > 0 && <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-1.5">
              💬 <span>آراء وتجارب عملائنا:</span>
            </h4>
            {reviewStats && <div className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 shrink-0">
              <span className="flex items-center gap-0.5 text-amber-500" aria-label={`${reviewStats.rating.toFixed(1)} من 5 نجوم`}>
                {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`w-4 h-4 ${index < Math.round(reviewStats.rating) ? 'fill-current' : ''}`} />)}
              </span>
              <span>{reviewStats.rating.toFixed(1)} <span className="hidden sm:inline">({reviewStats.reviewsCount} تقييم)</span></span>
            </div>}
          </div>
          <div className={`grid grid-cols-1 ${displayedReviews.length > 1 ? 'lg:grid-cols-3' : ''} gap-3`}>
            {displayedReviews.map((rev, idx) => (
              <div key={`${rev.name}-${idx}`} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black shrink-0">
                        {rev.name[0]}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1 truncate">
                          <span>{rev.name}</span>
                        </h5>
                        <span className="text-xs text-slate-500 block truncate">{rev.city}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-500 shrink-0" aria-label={`${rev.rating} من 5 نجوم`}>
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star key={index} className={`w-4 h-4 ${index < rev.rating ? 'fill-current' : ''}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-semibold">
                    "{rev.comment}"
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end text-xs text-slate-500 font-medium">
                  <span>{rev.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>}

        <section className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4" aria-labelledby="review-form-title">
          <div className="border-b border-slate-100 pb-3">
            <h2 id="review-form-title" className="text-lg sm:text-xl font-black text-slate-900">شاركنا رأيك</h2>
            <p className="mt-1 text-sm text-slate-600">تقييمك يساعدنا على تحسين تجربتك.</p>
          </div>

          {reviewSubmitted && (
            <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
              شكراً لك، تمت إضافة تقييمك بنجاح.
            </p>
          )}

          <form onSubmit={handleReviewSubmit} className="space-y-3.5">
            <fieldset>
              <legend className="mb-2 text-sm font-bold text-slate-800">تقييمك للمنتج</legend>
              <div className="flex items-center gap-1" dir="ltr">
                {Array.from({ length: 5 }, (_, index) => {
                  const rating = index + 1;
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setReviewRating(rating)}
                      aria-label={`${rating} من 5 نجوم`}
                      aria-pressed={reviewRating === rating}
                      className="rounded-sm p-1 text-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      <Star className={`h-7 w-7 ${rating <= reviewRating ? 'fill-current' : ''}`} />
                    </button>
                  );
                })}
                <span className="mr-2 text-sm font-bold text-slate-700">{reviewRating}/5</span>
              </div>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-sm font-bold text-slate-800">
                <span className="block">الاسم</span>
                <input
                  required
                  maxLength={60}
                  value={reviewName}
                  onChange={(event) => setReviewName(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-medium focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  placeholder="اكتب اسمك"
                />
              </label>
              <label className="space-y-1 text-sm font-bold text-slate-800">
                <span className="block">المدينة <span className="font-normal text-slate-500">(اختياري)</span></span>
                <input
                  maxLength={60}
                  value={reviewCity}
                  onChange={(event) => setReviewCity(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-medium focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  placeholder="مثال: الرياض"
                />
              </label>
            </div>

            <label className="block space-y-1 text-sm font-bold text-slate-800">
              <span>تعليقك</span>
              <textarea
                required
                minLength={3}
                maxLength={500}
                rows={4}
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 font-medium focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="كيف كانت تجربتك مع المنتج؟"
              />
            </label>

            <button type="submit" className="min-h-11 rounded-lg bg-emerald-700 px-5 py-2.5 font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
              إرسال التقييم
            </button>
          </form>
        </section>


      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 px-4 pt-6 pb-24 text-center text-xs border-t border-slate-800 space-y-1 mt-8 sm:pb-12">
        <p className="font-bold text-slate-300">جميع الحقوق محفوظة © {new Date().getFullYear()} ORYX STORE | متجر أوريكس السعودي</p>
        <p className="text-xs text-slate-500">الدفع عند الاستلام | توصيل سريع لكافة مناطق ومدن المملكة</p>
      </footer>

      {/* Sticky Mobile Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-40 sm:hidden flex items-center justify-between gap-3 shadow-lg">
        <div>
          <span className="text-xs text-slate-600 font-semibold block">السعر الإجمالي:</span>
          <span className="text-base font-black text-emerald-700">{totalPrice} ر.س</span>
        </div>
        <a href="#order-form-container" className="min-h-12 flex-1 flex items-center justify-center text-center bg-emerald-600 text-white font-black text-sm py-3 px-3 rounded-xl shadow-md">
          اطلب الآن - الدفع عند الاستلام
        </a>
      </div>

    </div>
  );
};
