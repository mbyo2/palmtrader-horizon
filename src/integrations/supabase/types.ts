export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      account_details: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          date_of_birth: string | null
          first_name: string | null
          id: string
          is_email_verified: boolean | null
          is_phone_verified: boolean | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          last_name: string | null
          onboarding_completed: boolean | null
          phone_number: string | null
          role: Database["public"]["Enums"]["account_role"]
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          id: string
          is_email_verified?: boolean | null
          is_phone_verified?: boolean | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["account_role"]
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          id?: string
          is_email_verified?: boolean | null
          is_phone_verified?: boolean | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["account_role"]
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      analyst_ratings: {
        Row: {
          analyst_firm: string
          created_at: string
          id: string
          previous_price_target: number | null
          previous_rating: string | null
          price_target: number | null
          rating: string
          rating_date: string
          symbol: string
        }
        Insert: {
          analyst_firm: string
          created_at?: string
          id?: string
          previous_price_target?: number | null
          previous_rating?: string | null
          price_target?: number | null
          rating: string
          rating_date: string
          symbol: string
        }
        Update: {
          analyst_firm?: string
          created_at?: string
          id?: string
          previous_price_target?: number | null
          previous_rating?: string | null
          price_target?: number | null
          rating?: string
          rating_date?: string
          symbol?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          branch_code: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          branch_code?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          branch_code?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_documents: {
        Row: {
          business_id: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_path: string
          id: string
          notes: string | null
          submitted_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          business_id?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_path: string
          id?: string
          notes?: string | null
          submitted_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          business_id?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          file_path?: string
          id?: string
          notes?: string | null
          submitted_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "local_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          flagged: boolean | null
          id: string
          moderation_notes: string | null
          parent_id: string | null
          symbol: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          flagged?: boolean | null
          id?: string
          moderation_notes?: string | null
          parent_id?: string | null
          symbol?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          flagged?: boolean | null
          id?: string
          moderation_notes?: string | null
          parent_id?: string | null
          symbol?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_fundamentals: {
        Row: {
          created_at: string
          debt_to_equity: number | null
          dividend_yield: number | null
          eps: number | null
          id: string
          industry: string | null
          market_cap: number | null
          name: string
          pe_ratio: number | null
          profit_margin: number | null
          revenue: number | null
          sector: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          debt_to_equity?: number | null
          dividend_yield?: number | null
          eps?: number | null
          id?: string
          industry?: string | null
          market_cap?: number | null
          name: string
          pe_ratio?: number | null
          profit_margin?: number | null
          revenue?: number | null
          sector?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          debt_to_equity?: number | null
          dividend_yield?: number | null
          eps?: number | null
          id?: string
          industry?: string | null
          market_cap?: number | null
          name?: string
          pe_ratio?: number | null
          profit_margin?: number | null
          revenue?: number | null
          sector?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_events: {
        Row: {
          assigned_to: string | null
          created_at: string
          event_data: Json
          event_type: string
          id: string
          notes: string | null
          risk_level: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          event_data: Json
          event_type: string
          id?: string
          notes?: string | null
          risk_level: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          notes?: string | null
          risk_level?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fund_transfers: {
        Row: {
          amount: number
          bank_account_id: string
          created_at: string
          direction: string
          id: string
          status: string
          transaction_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string
          direction: string
          id?: string
          status?: string
          transaction_ref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string
          direction?: string
          id?: string
          status?: string
          transaction_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_transfers_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ipo_allocations: {
        Row: {
          allocation_price: number
          application_id: string
          created_at: string | null
          id: string
          shares_allocated: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          allocation_price: number
          application_id: string
          created_at?: string | null
          id?: string
          shares_allocated: number
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          allocation_price?: number
          application_id?: string
          created_at?: string | null
          id?: string
          shares_allocated?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ipo_allocations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "ipo_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      ipo_applications: {
        Row: {
          created_at: string | null
          id: string
          ipo_id: string
          payment_status: string
          price_per_share: number
          shares_applied: number
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ipo_id: string
          payment_status?: string
          price_per_share: number
          shares_applied: number
          status?: string
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ipo_id?: string
          payment_status?: string
          price_per_share?: number
          shares_applied?: number
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ipo_applications_ipo_id_fkey"
            columns: ["ipo_id"]
            isOneToOne: false
            referencedRelation: "ipo_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      ipo_listings: {
        Row: {
          company_name: string
          created_at: string | null
          description: string | null
          id: string
          issue_price_max: number
          issue_price_min: number
          listing_date: string | null
          minimum_lot_size: number
          retail_allocation_percentage: number
          sector: string | null
          status: string
          subscription_end_date: string
          subscription_start_date: string
          symbol: string
          total_shares: number
          updated_at: string | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          issue_price_max: number
          issue_price_min: number
          listing_date?: string | null
          minimum_lot_size?: number
          retail_allocation_percentage: number
          sector?: string | null
          status?: string
          subscription_end_date: string
          subscription_start_date: string
          symbol: string
          total_shares: number
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          issue_price_max?: number
          issue_price_min?: number
          listing_date?: string | null
          minimum_lot_size?: number
          retail_allocation_percentage?: number
          sector?: string | null
          status?: string
          subscription_end_date?: string
          subscription_start_date?: string
          symbol?: string
          total_shares?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          rejection_reason: string | null
          updated_at: string
          user_id: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          rejection_reason?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          rejection_reason?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          address_verified: boolean | null
          aml_status: string | null
          created_at: string
          email_verified: boolean | null
          id: string
          identity_verified: boolean | null
          last_verification_date: string | null
          pep_check: boolean | null
          phone_verified: boolean | null
          risk_score: number | null
          sanctions_check: boolean | null
          updated_at: string
          user_id: string
          verification_level: string
          verification_notes: string | null
        }
        Insert: {
          address_verified?: boolean | null
          aml_status?: string | null
          created_at?: string
          email_verified?: boolean | null
          id?: string
          identity_verified?: boolean | null
          last_verification_date?: string | null
          pep_check?: boolean | null
          phone_verified?: boolean | null
          risk_score?: number | null
          sanctions_check?: boolean | null
          updated_at?: string
          user_id: string
          verification_level?: string
          verification_notes?: string | null
        }
        Update: {
          address_verified?: boolean | null
          aml_status?: string | null
          created_at?: string
          email_verified?: boolean | null
          id?: string
          identity_verified?: boolean | null
          last_verification_date?: string | null
          pep_check?: boolean | null
          phone_verified?: boolean | null
          risk_score?: number | null
          sanctions_check?: boolean | null
          updated_at?: string
          user_id?: string
          verification_level?: string
          verification_notes?: string | null
        }
        Relationships: []
      }
      local_businesses: {
        Row: {
          admin_notes: string | null
          business_operations_details: string | null
          company_name: string
          corporate_governance_details: string | null
          created_at: string | null
          description: string | null
          documents_submitted: boolean | null
          financial_statements_submitted: boolean | null
          id: string
          management_experience_details: string | null
          profit_history: Json | null
          public_shares_percentage: number | null
          reviewed_by: string | null
          sector: string | null
          share_capital: number | null
          sponsoring_broker: string | null
          submitted_by: string | null
          symbol: string
          total_shareholders: number | null
          total_shares: number | null
          underwriter: string | null
          updated_at: string | null
          verification_status:
            | Database["public"]["Enums"]["business_verification_status"]
            | null
        }
        Insert: {
          admin_notes?: string | null
          business_operations_details?: string | null
          company_name: string
          corporate_governance_details?: string | null
          created_at?: string | null
          description?: string | null
          documents_submitted?: boolean | null
          financial_statements_submitted?: boolean | null
          id?: string
          management_experience_details?: string | null
          profit_history?: Json | null
          public_shares_percentage?: number | null
          reviewed_by?: string | null
          sector?: string | null
          share_capital?: number | null
          sponsoring_broker?: string | null
          submitted_by?: string | null
          symbol: string
          total_shareholders?: number | null
          total_shares?: number | null
          underwriter?: string | null
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["business_verification_status"]
            | null
        }
        Update: {
          admin_notes?: string | null
          business_operations_details?: string | null
          company_name?: string
          corporate_governance_details?: string | null
          created_at?: string | null
          description?: string | null
          documents_submitted?: boolean | null
          financial_statements_submitted?: boolean | null
          id?: string
          management_experience_details?: string | null
          profit_history?: Json | null
          public_shares_percentage?: number | null
          reviewed_by?: string | null
          sector?: string | null
          share_capital?: number | null
          sponsoring_broker?: string | null
          submitted_by?: string | null
          symbol?: string
          total_shareholders?: number | null
          total_shares?: number | null
          underwriter?: string | null
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["business_verification_status"]
            | null
        }
        Relationships: []
      }
      market_data: {
        Row: {
          close: number | null
          created_at: string
          high: number | null
          id: string
          low: number | null
          open: number | null
          price: number
          symbol: string
          timestamp: number
          type: string
        }
        Insert: {
          close?: number | null
          created_at?: string
          high?: number | null
          id?: string
          low?: number | null
          open?: number | null
          price: number
          symbol: string
          timestamp: number
          type: string
        }
        Update: {
          close?: number | null
          created_at?: string
          high?: number | null
          id?: string
          low?: number | null
          open?: number | null
          price?: number
          symbol?: string
          timestamp?: number
          type?: string
        }
        Relationships: []
      }
      market_news: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          published_at: string
          sentiment: string | null
          source: string
          summary: string | null
          symbols: string[] | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          published_at: string
          sentiment?: string | null
          source: string
          summary?: string | null
          symbols?: string[] | null
          title: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string
          sentiment?: string | null
          source?: string
          summary?: string | null
          symbols?: string[] | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      mobile_money_accounts: {
        Row: {
          account_name: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          phone_number: string
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          phone_number: string
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          phone_number?: string
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mobile_money_transactions: {
        Row: {
          account_id: string
          amount: number
          completed_at: string | null
          created_at: string | null
          currency: string
          external_reference: string | null
          fees: number
          id: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          external_reference?: string | null
          fees?: number
          id?: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          external_reference?: string | null
          fees?: number
          id?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_money_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mobile_money_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      options_trades: {
        Row: {
          contracts: number
          created_at: string | null
          expiration_date: string
          id: string
          option_type: string
          premium_per_contract: number
          status: string | null
          strike_price: number
          symbol: string
          total_premium: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contracts: number
          created_at?: string | null
          expiration_date: string
          id?: string
          option_type: string
          premium_per_contract: number
          status?: string | null
          strike_price: number
          symbol: string
          total_premium: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contracts?: number
          created_at?: string | null
          expiration_date?: string
          id?: string
          option_type?: string
          premium_per_contract?: number
          status?: string | null
          strike_price?: number
          symbol?: string
          total_premium?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_history: {
        Row: {
          average_fill_price: number | null
          created_at: string
          filled_quantity: number | null
          id: string
          order_id: string
          order_type: string
          price: number | null
          quantity: number
          side: string
          status: string
          status_reason: string | null
          symbol: string
          user_id: string
        }
        Insert: {
          average_fill_price?: number | null
          created_at?: string
          filled_quantity?: number | null
          id?: string
          order_id: string
          order_type: string
          price?: number | null
          quantity: number
          side: string
          status: string
          status_reason?: string | null
          symbol: string
          user_id: string
        }
        Update: {
          average_fill_price?: number | null
          created_at?: string
          filled_quantity?: number | null
          id?: string
          order_id?: string
          order_type?: string
          price?: number | null
          quantity?: number
          side?: string
          status?: string
          status_reason?: string | null
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          average_fill_price: number | null
          created_at: string
          expires_at: string | null
          filled_quantity: number | null
          id: string
          limit_price: number | null
          order_type: string
          price: number | null
          quantity: number
          side: string
          status: string
          stop_price: number | null
          symbol: string
          time_in_force: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_fill_price?: number | null
          created_at?: string
          expires_at?: string | null
          filled_quantity?: number | null
          id?: string
          limit_price?: number | null
          order_type: string
          price?: number | null
          quantity: number
          side: string
          status?: string
          stop_price?: number | null
          symbol: string
          time_in_force?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_fill_price?: number | null
          created_at?: string
          expires_at?: string | null
          filled_quantity?: number | null
          id?: string
          limit_price?: number | null
          order_type?: string
          price?: number | null
          quantity?: number
          side?: string
          status?: string
          stop_price?: number | null
          symbol?: string
          time_in_force?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_mask: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          metadata: Json | null
          method_type: string
          provider: string
          provider_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_mask?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          metadata?: Json | null
          method_type: string
          provider: string
          provider_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_mask?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          metadata?: Json | null
          method_type?: string
          provider?: string
          provider_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio: {
        Row: {
          average_price: number
          created_at: string
          id: string
          shares: number
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_price: number
          created_at?: string
          id?: string
          shares?: number
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_price?: number
          created_at?: string
          id?: string
          shares?: number
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          average_cost: number
          created_at: string
          id: string
          market_value: number | null
          quantity: number
          realized_pnl: number | null
          symbol: string
          unrealized_pnl: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_cost: number
          created_at?: string
          id?: string
          market_value?: number | null
          quantity?: number
          realized_pnl?: number | null
          symbol: string
          unrealized_pnl?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_cost?: number
          created_at?: string
          id?: string
          market_value?: number | null
          quantity?: number
          realized_pnl?: number | null
          symbol?: string
          unrealized_pnl?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          condition: string
          created_at: string
          id: string
          is_active: boolean | null
          is_triggered: boolean | null
          symbol: string
          target_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          condition: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_triggered?: boolean | null
          symbol: string
          target_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_triggered?: boolean | null
          symbol?: string
          target_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          subscription_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          subscription_data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          subscription_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_investments: {
        Row: {
          amount: number
          created_at: string | null
          frequency: string
          id: string
          is_active: boolean | null
          next_execution_date: string
          symbol: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          next_execution_date: string
          symbol: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          next_execution_date?: string
          symbol?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json | null
          resolved: boolean | null
          service: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          message: string
          metadata?: Json | null
          resolved?: boolean | null
          service: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          resolved?: boolean | null
          service?: string
        }
        Relationships: []
      }
      tax_documents: {
        Row: {
          created_at: string
          document_type: string
          file_path: string | null
          generated_at: string | null
          id: string
          status: string
          tax_year: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_path?: string | null
          generated_at?: string | null
          id?: string
          status?: string
          tax_year: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_path?: string | null
          generated_at?: string | null
          id?: string
          status?: string
          tax_year?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      technical_indicators: {
        Row: {
          created_at: string
          id: string
          indicator_type: string
          period: number | null
          symbol: string
          timestamp: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          indicator_type: string
          period?: number | null
          symbol: string
          timestamp?: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          indicator_type?: string
          period?: number | null
          symbol?: string
          timestamp?: string
          value?: number
        }
        Relationships: []
      }
      trades: {
        Row: {
          commission: number | null
          created_at: string
          executed_at: string | null
          fees: number | null
          id: string
          is_fractional: boolean | null
          limit_price: number | null
          next_execution_date: string | null
          oco_link_id: string | null
          order_type: string | null
          price: number
          recurring_schedule: string | null
          risk_level: string | null
          shares: number
          status: string
          stop_price: number | null
          symbol: string
          total_amount: number
          trailing_percent: number | null
          type: string
          user_id: string
        }
        Insert: {
          commission?: number | null
          created_at?: string
          executed_at?: string | null
          fees?: number | null
          id?: string
          is_fractional?: boolean | null
          limit_price?: number | null
          next_execution_date?: string | null
          oco_link_id?: string | null
          order_type?: string | null
          price: number
          recurring_schedule?: string | null
          risk_level?: string | null
          shares: number
          status?: string
          stop_price?: number | null
          symbol: string
          total_amount: number
          trailing_percent?: number | null
          type: string
          user_id: string
        }
        Update: {
          commission?: number | null
          created_at?: string
          executed_at?: string | null
          fees?: number | null
          id?: string
          is_fractional?: boolean | null
          limit_price?: number | null
          next_execution_date?: string | null
          oco_link_id?: string | null
          order_type?: string | null
          price?: number
          recurring_schedule?: string | null
          risk_level?: string | null
          shares?: number
          status?: string
          stop_price?: number | null
          symbol?: string
          total_amount?: number
          trailing_percent?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          external_transaction_id: string | null
          id: string
          metadata: Json | null
          payment_method_id: string | null
          processed_at: string | null
          reference_number: string | null
          status: string
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          external_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          payment_method_id?: string | null
          processed_at?: string | null
          reference_number?: string | null
          status?: string
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          external_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          payment_method_id?: string | null
          processed_at?: string | null
          reference_number?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          account_activity: boolean | null
          allow_data_collection: boolean | null
          created_at: string
          currency: string
          email_notifications: boolean | null
          id: string
          login_notifications: boolean | null
          market_updates: boolean | null
          marketing_communications: boolean | null
          price_alerts: boolean | null
          push_notifications: boolean | null
          trade_confirmations: boolean | null
          two_factor_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_activity?: boolean | null
          allow_data_collection?: boolean | null
          created_at?: string
          currency?: string
          email_notifications?: boolean | null
          id?: string
          login_notifications?: boolean | null
          market_updates?: boolean | null
          marketing_communications?: boolean | null
          price_alerts?: boolean | null
          push_notifications?: boolean | null
          trade_confirmations?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_activity?: boolean | null
          allow_data_collection?: boolean | null
          created_at?: string
          currency?: string
          email_notifications?: boolean | null
          id?: string
          login_notifications?: boolean | null
          market_updates?: boolean | null
          marketing_communications?: boolean | null
          price_alerts?: boolean | null
          push_notifications?: boolean | null
          trade_confirmations?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          display_name: string | null
          first_name: string | null
          investment_experience: string | null
          investment_goals: string[] | null
          last_name: string | null
          phone: string | null
          risk_tolerance: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          investment_experience?: string | null
          investment_goals?: string[] | null
          last_name?: string | null
          phone?: string | null
          risk_tolerance?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          investment_experience?: string | null
          investment_goals?: string[] | null
          last_name?: string | null
          phone?: string | null
          risk_tolerance?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_balances: {
        Row: {
          available_balance: number
          created_at: string
          currency: string
          id: string
          reserved_balance: number
          total_balance: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          currency: string
          id?: string
          reserved_balance?: number
          total_balance?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          reserved_balance?: number
          total_balance?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          available_balance: number
          created_at: string
          currency: string
          id: string
          reserved_balance: number
          total_balance: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          reserved_balance?: number
          total_balance?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          reserved_balance?: number
          total_balance?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlists: {
        Row: {
          created_at: string
          id: string
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_popular_stocks: {
        Args: Record<PropertyKey, never>
        Returns: {
          comment_count: number
          symbol: string
          unique_users: number
        }[]
      }
      get_user_follower_count: {
        Args: { target_user_id: string }
        Returns: number
      }
      get_user_following_count: {
        Args: { target_user_id: string }
        Returns: number
      }
    }
    Enums: {
      account_role: "basic" | "premium" | "admin"
      account_status: "pending" | "active" | "restricted" | "suspended"
      business_verification_status: "pending" | "approved" | "rejected"
      document_type:
        | "prospectus"
        | "accountant_report"
        | "underwriting_agreement"
        | "listing_application"
        | "expert_consents"
        | "director_declarations"
        | "valuation_report"
        | "financial_statements"
      kyc_status: "not_started" | "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_role: ["basic", "premium", "admin"],
      account_status: ["pending", "active", "restricted", "suspended"],
      business_verification_status: ["pending", "approved", "rejected"],
      document_type: [
        "prospectus",
        "accountant_report",
        "underwriting_agreement",
        "listing_application",
        "expert_consents",
        "director_declarations",
        "valuation_report",
        "financial_statements",
      ],
      kyc_status: ["not_started", "pending", "approved", "rejected"],
    },
  },
} as const
