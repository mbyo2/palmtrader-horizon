
export class SubscriptionManager {
  private subscriptions: Set<string> = new Set();
  private pendingSubscriptions: Set<string> = new Set();

  public subscribe(symbol: string): boolean {
    if (!symbol) return false;
    
    const formattedSymbol = symbol.toUpperCase();
    if (this.subscriptions.has(formattedSymbol)) {
      return false; // Already subscribed
    }
    
    this.subscriptions.add(formattedSymbol);
    return true;
  }

  public unsubscribe(symbol: string): boolean {
    if (!symbol) return false;
    
    const formattedSymbol = symbol.toUpperCase();
    const wasSubscribed = this.subscriptions.delete(formattedSymbol);
    this.pendingSubscriptions.delete(formattedSymbol);
    return wasSubscribed;
  }

  public addToPending(symbol: string) {
    this.pendingSubscriptions.add(symbol.toUpperCase());
  }

  public removeFromPending(symbol: string) {
    this.pendingSubscriptions.delete(symbol.toUpperCase());
  }

  public getPendingSubscriptions(): string[] {
    return Array.from(this.pendingSubscriptions);
  }

  public getAllSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  public isSubscribed(symbol: string): boolean {
    return this.subscriptions.has(symbol.toUpperCase());
  }

  public clear() {
    this.subscriptions.clear();
    this.pendingSubscriptions.clear();
  }
}
