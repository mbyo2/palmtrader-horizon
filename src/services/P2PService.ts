import { supabase } from "@/integrations/supabase/client";

export interface P2PAdvertisement {
  id: string;
  user_id: string;
  type: 'buy' | 'sell';
  crypto_currency: string;
  fiat_currency: string;
  price: number;
  min_amount: number;
  max_amount: number;
  available_amount: number;
  payment_methods: string[];
  terms?: string;
  auto_reply?: string;
  is_active: boolean;
  completion_rate: number;
  avg_release_time: number;
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

export interface P2POrder {
  id: string;
  advertisement_id: string;
  buyer_id: string;
  seller_id: string;
  crypto_currency: string;
  fiat_currency: string;
  crypto_amount: number;
  fiat_amount: number;
  price: number;
  payment_method: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  payment_status: 'pending' | 'paid' | 'confirmed' | 'released' | 'refunded';
  escrow_released: boolean;
  buyer_confirmed_payment: boolean;
  seller_confirmed_receipt: boolean;
  chat_enabled: boolean;
  dispute_reason?: string;
  expires_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface P2PMessage {
  id: string;
  order_id: string;
  sender_id: string;
  message: string;
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface CreateAdRequest {
  type: 'buy' | 'sell';
  crypto_currency: string;
  fiat_currency: string;
  price: number;
  min_amount: number;
  max_amount: number;
  available_amount: number;
  payment_methods: string[];
  terms?: string;
  auto_reply?: string;
}

export class P2PService {
  // Advertisements
  static async getAdvertisements(
    type?: 'buy' | 'sell',
    cryptoCurrency?: string,
    fiatCurrency?: string
  ): Promise<P2PAdvertisement[]> {
    let query = supabase
      .from('p2p_advertisements')
      .select('*')
      .eq('is_active', true)
      .gt('available_amount', 0);

    if (type) query = query.eq('type', type);
    if (cryptoCurrency) query = query.eq('crypto_currency', cryptoCurrency);
    if (fiatCurrency) query = query.eq('fiat_currency', fiatCurrency);

    const { data, error } = await query.order('price', { ascending: type === 'sell' });

    if (error) throw error;

    return (data || []).map(ad => ({
      ...ad,
      type: ad.type as 'buy' | 'sell',
      price: Number(ad.price),
      min_amount: Number(ad.min_amount),
      max_amount: Number(ad.max_amount),
      available_amount: Number(ad.available_amount),
      completion_rate: Number(ad.completion_rate),
      avg_release_time: Number(ad.avg_release_time)
    }));
  }

  static async getMyAdvertisements(userId: string): Promise<P2PAdvertisement[]> {
    const { data, error } = await supabase
      .from('p2p_advertisements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(ad => ({
      ...ad,
      type: ad.type as 'buy' | 'sell',
      price: Number(ad.price),
      min_amount: Number(ad.min_amount),
      max_amount: Number(ad.max_amount),
      available_amount: Number(ad.available_amount),
      completion_rate: Number(ad.completion_rate),
      avg_release_time: Number(ad.avg_release_time)
    }));
  }

  static async createAdvertisement(userId: string, request: CreateAdRequest): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('p2p_advertisements')
        .insert({
          user_id: userId,
          ...request
        })
        .select('id')
        .single();

      if (error) throw error;
      return { success: true, id: data.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create advertisement' };
    }
  }

  static async updateAdvertisement(adId: string, updates: Partial<CreateAdRequest>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('p2p_advertisements')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', adId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update' };
    }
  }

  static async deactivateAdvertisement(adId: string): Promise<{ success: boolean; error?: string }> {
    return this.updateAdvertisement(adId, { is_active: false } as any);
  }

  // Orders
  static async createOrder(
    advertisementId: string,
    buyerId: string,
    sellerId: string,
    cryptoAmount: number,
    fiatAmount: number,
    price: number,
    paymentMethod: string,
    cryptoCurrency: string,
    fiatCurrency: string
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minute payment window

      const { data, error } = await supabase
        .from('p2p_orders')
        .insert({
          advertisement_id: advertisementId,
          buyer_id: buyerId,
          seller_id: sellerId,
          crypto_currency: cryptoCurrency,
          fiat_currency: fiatCurrency,
          crypto_amount: cryptoAmount,
          fiat_amount: fiatAmount,
          price,
          payment_method: paymentMethod,
          expires_at: expiresAt.toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return { success: true, orderId: data.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create order' };
    }
  }

  static async getMyOrders(userId: string): Promise<P2POrder[]> {
    const { data, error } = await supabase
      .from('p2p_orders')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(order => ({
      ...order,
      crypto_amount: Number(order.crypto_amount),
      fiat_amount: Number(order.fiat_amount),
      price: Number(order.price)
    }));
  }

  static async getOrder(orderId: string): Promise<P2POrder | null> {
    const { data, error } = await supabase
      .from('p2p_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) return null;
    return {
      ...data,
      crypto_amount: Number(data.crypto_amount),
      fiat_amount: Number(data.fiat_amount),
      price: Number(data.price)
    };
  }

  static async confirmPayment(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('p2p_orders')
        .update({ 
          buyer_confirmed_payment: true, 
          payment_status: 'paid',
          status: 'in_progress',
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to confirm payment' };
    }
  }

  static async releaseEscrow(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('p2p_orders')
        .update({ 
          seller_confirmed_receipt: true,
          escrow_released: true,
          payment_status: 'released',
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to release escrow' };
    }
  }

  static async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('p2p_orders')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel order' };
    }
  }

  static async openDispute(orderId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('p2p_orders')
        .update({ 
          status: 'disputed',
          dispute_reason: reason,
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to open dispute' };
    }
  }

  // Chat
  static async getMessages(orderId: string): Promise<P2PMessage[]> {
    const { data, error } = await supabase
      .from('p2p_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async sendMessage(orderId: string, senderId: string, message: string, attachmentUrl?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('p2p_messages')
        .insert({
          order_id: orderId,
          sender_id: senderId,
          message,
          attachment_url: attachmentUrl
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send message' };
    }
  }

  static subscribeToMessages(orderId: string, callback: (message: P2PMessage) => void) {
    return supabase
      .channel(`p2p_messages:${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'p2p_messages',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        callback(payload.new as P2PMessage);
      })
      .subscribe();
  }
}
