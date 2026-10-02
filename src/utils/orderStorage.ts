import { Order, Product } from '../types';

const STORAGE_KEY = 'oryx_orders_v1';
const WEBHOOK_KEY = 'oryx_sheets_webhook_v1';
const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxOApBFluDinG5d-QgdM-6raMqcHT5o8rWzD-Rnep6b8P-irli9-OlcVEpokRLMuO7q4Q/exec';

export function getSavedOrders(): Order[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    const orders = parsed as Order[];
    const realOrders = orders.filter(order => !(
      order.id === 'ORD-9842' &&
      order.fullName === 'محمد الشمري' &&
      order.phone === '0501234567'
    ));

    if (realOrders.length !== orders.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(realOrders));
    }
    return realOrders;
  } catch {
    return [];
  }
}

export function getProductSku(product: Product): string {
  return product.cjProductSku?.trim() || product.specs?.['كود SKU']?.trim() || '';
}

export function createProductSnapshot(product: Product) {
  const productSku = getProductSku(product);
  return {
    title: product.title,
    ...(productSku ? { productSku } : {}),
    ...(product.cjProductId ? { sourceProductId: product.cjProductId } : {}),
    ...(product.productUrl ? { productUrl: product.productUrl } : {}),
    image: product.image,
    description: product.description,
    features: [...product.features],
    ...(product.specs ? { specs: { ...product.specs } } : {})
  };
}

export function saveOrder(newOrder: Omit<Order, 'id' | 'createdAt' | 'status'>): Order {
  const orders = getSavedOrders();
  const order: Order = {
    ...newOrder,
    id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
    status: 'جديد'
  };

  const updated = [order, ...orders];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Try to submit to Google Sheets Webhook if configured
  const webhookUrl = getSheetsWebhookUrl();
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(order)
    }).catch(err => console.error('Google Sheets Webhook error:', err));
  }

  return order;
}

export function updateOrderStatus(orderId: string, status: Order['status']): Order[] {
  const orders = getSavedOrders();
  const updated = orders.map(o => o.id === orderId ? { ...o, status } : o);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteOrder(orderId: string): Order[] {
  const orders = getSavedOrders();
  const updated = orders.filter(o => o.id !== orderId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function getSheetsWebhookUrl(): string {
  return localStorage.getItem(WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;
}

export function saveSheetsWebhookUrl(url: string): void {
  localStorage.setItem(WEBHOOK_KEY, url);
}
