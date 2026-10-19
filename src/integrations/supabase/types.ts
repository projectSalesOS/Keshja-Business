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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          archived_at: string | null
          city: string | null
          contact_person: string | null
          country: string
          created_at: string
          created_by: string
          customer_number: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          street: string | null
          updated_at: string
          vat_id: string | null
        }
        Insert: {
          archived_at?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string
          created_at?: string
          created_by?: string
          customer_number?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string
          vat_id?: string | null
        }
        Update: {
          archived_at?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string
          created_at?: string
          created_by?: string
          customer_number?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string
          vat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_items: {
        Row: {
          created_at: string
          description: string
          document_id: string
          id: string
          organization_id: string
          position: number
          quantity: number
          tax_rate: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          document_id: string
          id?: string
          organization_id: string
          position?: number
          quantity?: number
          tax_rate?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          document_id?: string
          id?: string
          organization_id?: string
          position?: number
          quantity?: number
          tax_rate?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          cancels_document_id: string | null
          company_snapshot: Json | null
          created_at: string
          created_by: string
          customer_id: string | null
          customer_snapshot: Json | null
          doc_date: string
          due_date: string | null
          id: string
          intro: string | null
          issued_at: string | null
          kind: string
          number: string | null
          organization_id: string
          payment_days: number | null
          service_date: string | null
          service_period_end: string | null
          small_business: boolean
          source_quote_id: string | null
          status: string
          subtotal: number
          tax_total: number
          terms: string | null
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          cancels_document_id?: string | null
          company_snapshot?: Json | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          customer_snapshot?: Json | null
          doc_date?: string
          due_date?: string | null
          id?: string
          intro?: string | null
          issued_at?: string | null
          kind: string
          number?: string | null
          organization_id: string
          payment_days?: number | null
          service_date?: string | null
          service_period_end?: string | null
          small_business?: boolean
          source_quote_id?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          cancels_document_id?: string | null
          company_snapshot?: Json | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          customer_snapshot?: Json | null
          doc_date?: string
          due_date?: string | null
          id?: string
          intro?: string | null
          issued_at?: string | null
          kind?: string
          number?: string | null
          organization_id?: string
          payment_days?: number | null
          service_date?: string | null
          service_period_end?: string | null
          small_business?: boolean
          source_quote_id?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_cancels_document_id_fkey"
            columns: ["cancels_document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_source_quote_id_fkey"
            columns: ["source_quote_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      dunning_notices: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invoice_id: string
          level: number
          new_due_date: string
          notice_date: string
          open_amount: number
          organization_id: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          invoice_id: string
          level: number
          new_due_date: string
          notice_date?: string
          open_amount: number
          organization_id: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invoice_id?: string
          level?: number
          new_due_date?: string
          notice_date?: string
          open_amount?: number
          organization_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dunning_notices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_notices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_costs: {
        Row: {
          active: boolean
          amount: number
          category: string
          created_at: string
          description: string | null
          due_day: number
          end_date: string | null
          id: string
          interval: string
          name: string
          organization_id: string | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          category: string
          created_at?: string
          description?: string | null
          due_day?: number
          end_date?: string | null
          id?: string
          interval?: string
          name: string
          organization_id?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          active?: boolean
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          due_day?: number
          end_date?: string | null
          id?: string
          interval?: string
          name?: string
          organization_id?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_costs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          invite_code: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      number_sequences: {
        Row: {
          kind: string
          last_value: number
          organization_id: string
          year: number
        }
        Insert: {
          kind: string
          last_value?: number
          organization_id: string
          year: number
        }
        Update: {
          kind?: string
          last_value?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "number_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_usage: {
        Row: {
          created_at: string
          id: string
          image_hash: string
          organization_id: string
          period_start: string
          reason: string | null
          result: Json | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          image_hash: string
          organization_id: string
          period_start: string
          reason?: string | null
          result?: Json | null
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_hash?: string
          organization_id?: string
          period_start?: string
          reason?: string | null
          result?: Json | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          bank_name: string | null
          bic: string | null
          city: string | null
          country: string
          created_at: string
          created_by: string
          default_payment_days: number
          email: string | null
          iban: string | null
          id: string
          invite_code: string | null
          legal_form: string | null
          logo_path: string | null
          name: string
          phone: string | null
          postal_code: string | null
          small_business: boolean
          street: string | null
          tax_number: string | null
          updated_at: string
          vat_id: string | null
          website: string | null
        }
        Insert: {
          bank_name?: string | null
          bic?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string
          default_payment_days?: number
          email?: string | null
          iban?: string | null
          id?: string
          invite_code?: string | null
          legal_form?: string | null
          logo_path?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          small_business?: boolean
          street?: string | null
          tax_number?: string | null
          updated_at?: string
          vat_id?: string | null
          website?: string | null
        }
        Update: {
          bank_name?: string | null
          bic?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string
          default_payment_days?: number
          email?: string | null
          iban?: string | null
          id?: string
          invite_code?: string | null
          legal_form?: string | null
          logo_path?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          small_business?: boolean
          street?: string | null
          tax_number?: string | null
          updated_at?: string
          vat_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          invoice_id: string
          method: string | null
          note: string | null
          organization_id: string
          payment_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string
          id?: string
          invoice_id: string
          method?: string | null
          note?: string | null
          organization_id: string
          payment_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          invoice_id?: string
          method?: string | null
          note?: string | null
          organization_id?: string
          payment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_operators: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_operators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_organization_id: string | null
          created_at: string
          display_name: string | null
          email: string | null
          household_id: string | null
          id: string
          operator_notified_at: string | null
          updated_at: string
        }
        Insert: {
          active_organization_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          household_id?: string | null
          id: string
          operator_notified_at?: string | null
          updated_at?: string
        }
        Update: {
          active_organization_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          household_id?: string | null
          id?: string
          operator_notified_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_organization_id_fkey"
            columns: ["active_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_items: {
        Row: {
          category: string
          created_at: string
          discount: number
          discount_kind: string | null
          id: string
          kind: string
          line_type: string | null
          name: string
          original_price: number | null
          price: number
          quantity: number
          receipt_id: string
          subcategory: string
        }
        Insert: {
          category: string
          created_at?: string
          discount?: number
          discount_kind?: string | null
          id?: string
          kind?: string
          line_type?: string | null
          name: string
          original_price?: number | null
          price: number
          quantity?: number
          receipt_id: string
          subcategory: string
        }
        Update: {
          category?: string
          created_at?: string
          discount?: number
          discount_kind?: string | null
          id?: string
          kind?: string
          line_type?: string | null
          name?: string
          original_price?: number | null
          price?: number
          quantity?: number
          receipt_id?: string
          subcategory?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          customer_id: string | null
          date: string
          deposit_total: number
          discount_total: number
          goods_total: number
          household_id: string | null
          id: string
          image_sha256: string | null
          merchant: string
          model: string | null
          needs_review: boolean
          net_total: number | null
          organization_id: string | null
          time: string | null
          total: number
          trace: Json | null
          user_id: string | null
          vat_breakdown: Json
          vat_total: number | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          date: string
          deposit_total?: number
          discount_total?: number
          goods_total?: number
          household_id?: string | null
          id?: string
          image_sha256?: string | null
          merchant: string
          model?: string | null
          needs_review?: boolean
          net_total?: number | null
          organization_id?: string | null
          time?: string | null
          total: number
          trace?: Json | null
          user_id?: string | null
          vat_breakdown?: Json
          vat_total?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          date?: string
          deposit_total?: number
          discount_total?: number
          goods_total?: number
          household_id?: string | null
          id?: string
          image_sha256?: string | null
          merchant?: string
          model?: string | null
          needs_review?: boolean
          net_total?: number | null
          organization_id?: string | null
          time?: string | null
          total?: number
          trace?: Json | null
          user_id?: string | null
          vat_breakdown?: Json
          vat_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          environment: string
          event_type: string
          id: string
          processed_at: string
        }
        Insert: {
          environment: string
          event_type: string
          id: string
          processed_at?: string
        }
        Update: {
          environment?: string
          event_type?: string
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      subscription_audit: {
        Row: {
          administrator: string
          after_value: Json
          before_value: Json | null
          created_at: string
          id: string
          organization_id: string | null
          reason: string
        }
        Insert: {
          administrator: string
          after_value: Json
          before_value?: Json | null
          created_at?: string
          id?: string
          organization_id?: string | null
          reason: string
        }
        Update: {
          administrator?: string
          after_value?: Json
          before_value?: Json | null
          created_at?: string
          id?: string
          organization_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          external_customer_ref: string | null
          external_subscription_ref: string | null
          organization_id: string
          period_end: string | null
          plan_id: string
          renews_at: string | null
          source: string
          starts_at: string
          status: string
          stripe_environment: string | null
          trial_used: boolean
          updated_at: string
        }
        Insert: {
          billing_interval?: string | null
          external_customer_ref?: string | null
          external_subscription_ref?: string | null
          organization_id: string
          period_end?: string | null
          plan_id?: string
          renews_at?: string | null
          source?: string
          starts_at?: string
          status?: string
          stripe_environment?: string | null
          trial_used?: boolean
          updated_at?: string
        }
        Update: {
          billing_interval?: string | null
          external_customer_ref?: string | null
          external_subscription_ref?: string | null
          organization_id?: string
          period_end?: string | null
          plan_id?: string
          renews_at?: string | null
          source?: string
          starts_at?: string
          status?: string
          stripe_environment?: string | null
          trial_used?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "tariff_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tariff_plans: {
        Row: {
          advanced_reports: boolean
          documents: boolean
          id: string
          logo: boolean
          manual_limit: number | null
          name: string
          ocr_limit: number
          price_cents: number
          price_cents_annual: number
          price_cents_monthly: number
          stripe_price_annual: string | null
          stripe_price_monthly: string | null
          voice: boolean
        }
        Insert: {
          advanced_reports?: boolean
          documents?: boolean
          id: string
          logo?: boolean
          manual_limit?: number | null
          name: string
          ocr_limit?: number
          price_cents?: number
          price_cents_annual?: number
          price_cents_monthly?: number
          stripe_price_annual?: string | null
          stripe_price_monthly?: string | null
          voice?: boolean
        }
        Update: {
          advanced_reports?: boolean
          documents?: boolean
          id?: string
          logo?: boolean
          manual_limit?: number | null
          name?: string
          ocr_limit?: number
          price_cents?: number
          price_cents_annual?: number
          price_cents_monthly?: number
          stripe_price_annual?: string | null
          stripe_price_monthly?: string | null
          voice?: boolean
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          booking_date: string
          capture_source: string
          category: string
          created_at: string
          created_by: string
          customer_id: string | null
          description: string | null
          id: string
          organization_id: string
          payment_id: string | null
          receipt_id: string | null
          recurring_expense_id: string | null
          recurring_period: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_date?: string
          capture_source?: string
          category: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          organization_id: string
          payment_id?: string | null
          receipt_id?: string | null
          recurring_expense_id?: string | null
          recurring_period?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_date?: string
          capture_source?: string
          category?: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          payment_id?: string | null
          receipt_id?: string | null
          recurring_expense_id?: string | null
          recurring_period?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "fixed_costs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_due_recurring_expenses: { Args: { _org: string }; Returns: number }
      cancel_invoice: {
        Args: { _invoice: string; _reason: string }
        Returns: string
      }
      claim_initial_operator: { Args: { _reason: string }; Returns: undefined }
      create_household: { Args: { _name: string }; Returns: string }
      create_invoice_from_quote: { Args: { _quote: string }; Returns: string }
      create_organization: { Args: { _name: string }; Returns: string }
      finish_ocr: {
        Args: {
          _reason?: string
          _request: string
          _result?: Json
          _state: string
        }
        Returns: undefined
      }
      issue_document: { Args: { _doc: string }; Returns: string }
      join_household: { Args: { _code: string }; Returns: string }
      join_organization: { Args: { _code: string }; Returns: string }
      leave_household: { Args: never; Returns: undefined }
      leave_organization: { Args: { _org: string }; Returns: undefined }
      operator_bootstrap_status: { Args: never; Returns: Json }
      operator_dashboard: { Args: never; Returns: Json }
      operator_ocr_reservations: { Args: never; Returns: Json }
      operator_refund_ocr: {
        Args: { _reason: string; _request: string }
        Returns: undefined
      }
      operator_set_plan: {
        Args: { _plan: string; _reason: string; _values: Json }
        Returns: undefined
      }
      operator_set_subscription: {
        Args: {
          _end: string
          _org: string
          _plan: string
          _reason: string
          _start: string
          _status: string
        }
        Returns: undefined
      }
      regenerate_org_invite_code: { Args: { _org: string }; Returns: string }
      reserve_ocr: {
        Args: { _hash: string; _org: string; _request: string; _user: string }
        Returns: Json
      }
      tariff_feature: {
        Args: { _feature: string; _org: string }
        Returns: boolean
      }
      tariff_overview: { Args: { _org: string }; Returns: Json }
    }
    Enums: {
      org_role: "owner" | "admin" | "member"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      org_role: ["owner", "admin", "member"],
    },
  },
} as const
