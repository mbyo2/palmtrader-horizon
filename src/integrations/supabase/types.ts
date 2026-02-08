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
      account_type_configs: {
        Row: {
          account_type: Database["public"]["Enums"]["trading_account_type"]
          commission_per_lot: number | null
          created_at: string
          description: string | null
          display_name: string
          execution_type: string
          features: Json | null
          id: string
          is_available: boolean
          is_swap_free: boolean
          max_leverage: number
          min_deposit: number
          min_spread: number
          requirements: string | null
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["trading_account_type"]
          commission_per_lot?: number | null
          created_at?: string
          description?: string | null
          display_name: string
          execution_type: string
          features?: Json | null
          id?: string
          is_available?: boolean
          is_swap_free?: boolean
          max_leverage?: number
          min_deposit: number
          min_spread: number
          requirements?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["trading_account_type"]
          commission_per_lot?: number | null
          created_at?: string
          description?: string | null
          display_name?: string
          execution_type?: string
          features?: Json | null
          id?: string
          is_available?: boolean
          is_swap_free?: boolean
          max_leverage?: number
          min_deposit?: number
          min_spread?: number
          requirements?: string | null
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
      compliance_reports: {
        Row: {
          created_at: string
          critical_items: number | null
          file_path: string | null
          flagged_items: number | null
          generated_by: string
          id: string
          report_data: Json
          report_period_end: string
          report_period_start: string
          report_type: string
          status: string
          submitted_at: string | null
          submitted_to: string | null
          summary: string | null
          total_items: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          critical_items?: number | null
          file_path?: string | null
          flagged_items?: number | null
          generated_by: string
          id?: string
          report_data?: Json
          report_period_end: string
          report_period_start: string
          report_type: string
          status?: string
          submitted_at?: string | null
          submitted_to?: string | null
          summary?: string | null
          total_items?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          critical_items?: number | null
          file_path?: string | null
          flagged_items?: number | null
          generated_by?: string
          id?: string
          report_data?: Json
          report_period_end?: string
          report_period_start?: string
          report_type?: string
          status?: string
          submitted_at?: string | null
          submitted_to?: string | null
          summary?: string | null
          total_items?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      convert_history: {
        Row: {
          created_at: string
          fee: number | null
          from_amount: number
          from_currency: string
          id: string
          rate: number
          status: string | null
          to_amount: number
          to_currency: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fee?: number | null
          from_amount: number
          from_currency: string
          id?: string
          rate: number
          status?: string | null
          to_amount: number
          to_currency: string
          user_id: string
        }
        Update: {
          created_at?: string
          fee?: number | null
          from_amount?: number
          from_currency?: string
          id?: string
          rate?: number
          status?: string | null
          to_amount?: number
          to_currency?: string
          user_id?: string
        }
        Relationships: []
      }
      crypto_wallets: {
        Row: {
          available_balance: number
          created_at: string
          currency: string
          id: string
          locked_balance: number
          updated_at: string
          user_id: string
          wallet_type: Database["public"]["Enums"]["wallet_type"]
        }
        Insert: {
          available_balance?: number
          created_at?: string
          currency: string
          id?: string
          locked_balance?: number
          updated_at?: string
          user_id: string
          wallet_type?: Database["public"]["Enums"]["wallet_type"]
        }
        Update: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          locked_balance?: number
          updated_at?: string
          user_id?: string
          wallet_type?: Database["public"]["Enums"]["wallet_type"]
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
      futures_positions: {
        Row: {
          closed_at: string | null
          created_at: string
          entry_price: number
          id: string
          leverage: number
          liquidation_price: number | null
          margin: number
          quantity: number
          realized_pnl: number | null
          side: string
          status: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          unrealized_pnl: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          entry_price: number
          id?: string
          leverage?: number
          liquidation_price?: number | null
          margin: number
          quantity: number
          realized_pnl?: number | null
          side: string
          status?: string | null
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          unrealized_pnl?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          entry_price?: number
          id?: string
          leverage?: number
          liquidation_price?: number | null
          margin?: number
          quantity?: number
          realized_pnl?: number | null
          side?: string
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          unrealized_pnl?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      launchpad_projects: {
        Row: {
          created_at: string
          description: string | null
          distribution_time: string | null
          end_time: string
          id: string
          logo_url: string | null
          max_purchase: number
          min_purchase: number
          name: string
          payment_currency: string
          price_per_token: number
          start_time: string
          status: Database["public"]["Enums"]["launchpad_status"]
          symbol: string
          tokens_sold: number | null
          total_tokens: number
          updated_at: string
          website_url: string | null
          whitepaper_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          distribution_time?: string | null
          end_time: string
          id?: string
          logo_url?: string | null
          max_purchase: number
          min_purchase: number
          name: string
          payment_currency?: string
          price_per_token: number
          start_time: string
          status?: Database["public"]["Enums"]["launchpad_status"]
          symbol: string
          tokens_sold?: number | null
          total_tokens: number
          updated_at?: string
          website_url?: string | null
          whitepaper_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          distribution_time?: string | null
          end_time?: string
          id?: string
          logo_url?: string | null
          max_purchase?: number
          min_purchase?: number
          name?: string
          payment_currency?: string
          price_per_token?: number
          start_time?: string
          status?: Database["public"]["Enums"]["launchpad_status"]
          symbol?: string
          tokens_sold?: number | null
          total_tokens?: number
          updated_at?: string
          website_url?: string | null
          whitepaper_url?: string | null
        }
        Relationships: []
      }
      launchpad_subscriptions: {
        Row: {
          committed_amount: number
          created_at: string
          id: string
          payment_status: string | null
          project_id: string
          tokens_allocated: number | null
          tokens_claimed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          committed_amount: number
          created_at?: string
          id?: string
          payment_status?: string | null
          project_id: string
          tokens_allocated?: number | null
          tokens_claimed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          committed_amount?: number
          created_at?: string
          id?: string
          payment_status?: string | null
          project_id?: string
          tokens_allocated?: number | null
          tokens_claimed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launchpad_subscriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "launchpad_projects"
            referencedColumns: ["id"]
          },
        ]
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
      p2p_advertisements: {
        Row: {
          auto_reply: string | null
          available_amount: number
          avg_release_time: number | null
          completion_rate: number | null
          created_at: string
          crypto_currency: string
          fiat_currency: string
          id: string
          is_active: boolean | null
          max_amount: number
          min_amount: number
          payment_methods: string[]
          price: number
          terms: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_reply?: string | null
          available_amount: number
          avg_release_time?: number | null
          completion_rate?: number | null
          created_at?: string
          crypto_currency: string
          fiat_currency?: string
          id?: string
          is_active?: boolean | null
          max_amount: number
          min_amount: number
          payment_methods: string[]
          price: number
          terms?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_reply?: string | null
          available_amount?: number
          avg_release_time?: number | null
          completion_rate?: number | null
          created_at?: string
          crypto_currency?: string
          fiat_currency?: string
          id?: string
          is_active?: boolean | null
          max_amount?: number
          min_amount?: number
          payment_methods?: string[]
          price?: number
          terms?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      p2p_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          order_id: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          order_id: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          order_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2p_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_orders: {
        Row: {
          advertisement_id: string
          buyer_confirmed_payment: boolean | null
          buyer_id: string
          chat_enabled: boolean | null
          completed_at: string | null
          created_at: string
          crypto_amount: number
          crypto_currency: string
          dispute_reason: string | null
          escrow_released: boolean | null
          expires_at: string | null
          fiat_amount: number
          fiat_currency: string
          id: string
          payment_method: string
          payment_status: Database["public"]["Enums"]["p2p_payment_status"]
          price: number
          seller_confirmed_receipt: boolean | null
          seller_id: string
          status: Database["public"]["Enums"]["p2p_order_status"]
          updated_at: string
        }
        Insert: {
          advertisement_id: string
          buyer_confirmed_payment?: boolean | null
          buyer_id: string
          chat_enabled?: boolean | null
          completed_at?: string | null
          created_at?: string
          crypto_amount: number
          crypto_currency: string
          dispute_reason?: string | null
          escrow_released?: boolean | null
          expires_at?: string | null
          fiat_amount: number
          fiat_currency: string
          id?: string
          payment_method: string
          payment_status?: Database["public"]["Enums"]["p2p_payment_status"]
          price: number
          seller_confirmed_receipt?: boolean | null
          seller_id: string
          status?: Database["public"]["Enums"]["p2p_order_status"]
          updated_at?: string
        }
        Update: {
          advertisement_id?: string
          buyer_confirmed_payment?: boolean | null
          buyer_id?: string
          chat_enabled?: boolean | null
          completed_at?: string | null
          created_at?: string
          crypto_amount?: number
          crypto_currency?: string
          dispute_reason?: string | null
          escrow_released?: boolean | null
          expires_at?: string | null
          fiat_amount?: number
          fiat_currency?: string
          id?: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["p2p_payment_status"]
          price?: number
          seller_confirmed_receipt?: boolean | null
          seller_id?: string
          status?: Database["public"]["Enums"]["p2p_order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2p_orders_advertisement_id_fkey"
            columns: ["advertisement_id"]
            isOneToOne: false
            referencedRelation: "p2p_advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_logs: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          id: string
          processing_time_ms: number | null
          provider: string
          request_data: Json | null
          response_data: Json | null
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          provider: string
          request_data?: Json | null
          response_data?: Json | null
          status: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          provider?: string
          request_data?: Json | null
          response_data?: Json | null
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
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
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          expires_at: string
          id: string
          ip_address: unknown
          request_count: number
          user_id: string | null
          window_start: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          expires_at: string
          id?: string
          ip_address?: unknown
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          request_count?: number
          user_id?: string | null
          window_start?: string
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
      spot_orders: {
        Row: {
          average_fill_price: number | null
          created_at: string
          filled_quantity: number | null
          id: string
          order_type: string
          pair_id: string
          price: number | null
          quantity: number
          remaining_quantity: number | null
          side: string
          status: string
          stop_price: number | null
          time_in_force: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_fill_price?: number | null
          created_at?: string
          filled_quantity?: number | null
          id?: string
          order_type: string
          pair_id: string
          price?: number | null
          quantity: number
          remaining_quantity?: number | null
          side: string
          status?: string
          stop_price?: number | null
          time_in_force?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_fill_price?: number | null
          created_at?: string
          filled_quantity?: number | null
          id?: string
          order_type?: string
          pair_id?: string
          price?: number | null
          quantity?: number
          remaining_quantity?: number | null
          side?: string
          status?: string
          stop_price?: number | null
          time_in_force?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spot_orders_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "trading_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      spot_trades: {
        Row: {
          created_at: string
          id: string
          maker_fee: number
          maker_order_id: string
          maker_user_id: string
          pair_id: string
          price: number
          quantity: number
          taker_fee: number
          taker_order_id: string
          taker_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          maker_fee: number
          maker_order_id: string
          maker_user_id: string
          pair_id: string
          price: number
          quantity: number
          taker_fee: number
          taker_order_id: string
          taker_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          maker_fee?: number
          maker_order_id?: string
          maker_user_id?: string
          pair_id?: string
          price?: number
          quantity?: number
          taker_fee?: number
          taker_order_id?: string
          taker_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spot_trades_maker_order_id_fkey"
            columns: ["maker_order_id"]
            isOneToOne: false
            referencedRelation: "spot_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_trades_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "trading_pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_trades_taker_order_id_fkey"
            columns: ["taker_order_id"]
            isOneToOne: false
            referencedRelation: "spot_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      staking_positions: {
        Row: {
          accrued_interest: number | null
          amount: number
          auto_restake: boolean | null
          created_at: string
          end_date: string | null
          id: string
          last_interest_date: string | null
          product_id: string
          start_date: string
          status: Database["public"]["Enums"]["staking_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accrued_interest?: number | null
          amount: number
          auto_restake?: boolean | null
          created_at?: string
          end_date?: string | null
          id?: string
          last_interest_date?: string | null
          product_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["staking_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accrued_interest?: number | null
          amount?: number
          auto_restake?: boolean | null
          created_at?: string
          end_date?: string | null
          id?: string
          last_interest_date?: string | null
          product_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["staking_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staking_positions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staking_products"
            referencedColumns: ["id"]
          },
        ]
      }
      staking_products: {
        Row: {
          apy: number
          created_at: string
          currency: string
          id: string
          is_active: boolean | null
          lock_period_days: number | null
          max_amount: number | null
          min_amount: number
          name: string
          remaining_pool: number | null
          total_pool: number | null
          type: string
          updated_at: string
        }
        Insert: {
          apy: number
          created_at?: string
          currency: string
          id?: string
          is_active?: boolean | null
          lock_period_days?: number | null
          max_amount?: number | null
          min_amount: number
          name: string
          remaining_pool?: number | null
          total_pool?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          apy?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean | null
          lock_period_days?: number | null
          max_amount?: number | null
          min_amount?: number
          name?: string
          remaining_pool?: number | null
          total_pool?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      storage_access_logs: {
        Row: {
          action: string
          bucket_name: string
          content_type: string | null
          created_at: string | null
          error_message: string | null
          file_path: string
          file_size: number | null
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          bucket_name: string
          content_type?: string | null
          created_at?: string | null
          error_message?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          bucket_name?: string
          content_type?: string | null
          created_at?: string | null
          error_message?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suspicious_activities: {
        Row: {
          activity_type: string
          assigned_to: string | null
          created_at: string
          description: string
          details: Json
          id: string
          investigated_by: string | null
          investigation_notes: string | null
          related_transaction_id: string | null
          report_reference: string | null
          reported_to_authorities: boolean | null
          resolution: string | null
          resolved_at: string | null
          risk_score: number | null
          severity: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: string
          assigned_to?: string | null
          created_at?: string
          description: string
          details?: Json
          id?: string
          investigated_by?: string | null
          investigation_notes?: string | null
          related_transaction_id?: string | null
          report_reference?: string | null
          reported_to_authorities?: boolean | null
          resolution?: string | null
          resolved_at?: string | null
          risk_score?: number | null
          severity?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          assigned_to?: string | null
          created_at?: string
          description?: string
          details?: Json
          id?: string
          investigated_by?: string | null
          investigation_notes?: string | null
          related_transaction_id?: string | null
          report_reference?: string | null
          reported_to_authorities?: boolean | null
          resolution?: string | null
          resolved_at?: string | null
          risk_score?: number | null
          severity?: string
          status?: string
          updated_at?: string
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
      system_metrics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_value?: number
          timestamp?: string
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
      trading_accounts: {
        Row: {
          account_name: string | null
          account_number: string
          account_type: Database["public"]["Enums"]["trading_account_type"]
          available_balance: number
          balance: number
          commission_per_lot: number | null
          created_at: string
          currency: string
          id: string
          is_active: boolean
          is_verified: boolean
          leverage: number
          margin_call_level: number | null
          max_leverage: number
          min_deposit: number
          min_spread: number | null
          reserved_balance: number
          sec_zambia_compliant: boolean
          spread_type: string | null
          stop_out_level: number | null
          trading_disabled: boolean
          trading_disabled_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          account_type?: Database["public"]["Enums"]["trading_account_type"]
          available_balance?: number
          balance?: number
          commission_per_lot?: number | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          leverage?: number
          margin_call_level?: number | null
          max_leverage?: number
          min_deposit?: number
          min_spread?: number | null
          reserved_balance?: number
          sec_zambia_compliant?: boolean
          spread_type?: string | null
          stop_out_level?: number | null
          trading_disabled?: boolean
          trading_disabled_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          account_type?: Database["public"]["Enums"]["trading_account_type"]
          available_balance?: number
          balance?: number
          commission_per_lot?: number | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          leverage?: number
          margin_call_level?: number | null
          max_leverage?: number
          min_deposit?: number
          min_spread?: number | null
          reserved_balance?: number
          sec_zambia_compliant?: boolean
          spread_type?: string | null
          stop_out_level?: number | null
          trading_disabled?: boolean
          trading_disabled_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_pairs: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          is_active: boolean | null
          maker_fee: number | null
          max_order_size: number | null
          min_order_size: number | null
          price_precision: number | null
          quantity_precision: number | null
          quote_currency: string
          taker_fee: number | null
        }
        Insert: {
          base_currency: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          maker_fee?: number | null
          max_order_size?: number | null
          min_order_size?: number | null
          price_precision?: number | null
          quantity_precision?: number | null
          quote_currency: string
          taker_fee?: number | null
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          maker_fee?: number | null
          max_order_size?: number | null
          min_order_size?: number | null
          price_precision?: number | null
          quantity_precision?: number | null
          quote_currency?: string
          taker_fee?: number | null
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
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
      cleanup_old_logs: { Args: never; Returns: undefined }
      generate_account_number: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_popular_stocks: {
        Args: never
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
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      update_wallet_balance: {
        Args: {
          p_amount: number
          p_currency: string
          p_operation: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_role: "basic" | "premium" | "admin"
      account_status: "pending" | "active" | "restricted" | "suspended"
      app_role: "admin" | "moderator" | "user" | "premium"
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
      launchpad_status: "upcoming" | "active" | "completed" | "cancelled"
      p2p_order_status:
        | "open"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "disputed"
      p2p_payment_status:
        | "pending"
        | "paid"
        | "confirmed"
        | "released"
        | "refunded"
      staking_status: "active" | "completed" | "withdrawn"
      trading_account_type:
        | "demo"
        | "cent"
        | "standard_stp"
        | "raw_ecn"
        | "pro_ecn"
        | "islamic"
      wallet_type: "spot" | "funding" | "earn"
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
      app_role: ["admin", "moderator", "user", "premium"],
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
      launchpad_status: ["upcoming", "active", "completed", "cancelled"],
      p2p_order_status: [
        "open",
        "in_progress",
        "completed",
        "cancelled",
        "disputed",
      ],
      p2p_payment_status: [
        "pending",
        "paid",
        "confirmed",
        "released",
        "refunded",
      ],
      staking_status: ["active", "completed", "withdrawn"],
      trading_account_type: [
        "demo",
        "cent",
        "standard_stp",
        "raw_ecn",
        "pro_ecn",
        "islamic",
      ],
      wallet_type: ["spot", "funding", "earn"],
    },
  },
} as const
