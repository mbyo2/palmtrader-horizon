export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          id: string
          parent_id: string | null
          symbol: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          symbol?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
          symbol: string
          comment_count: number
          unique_users: number
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
