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
      fixed_costs: {
        Row: {
          amount: number
          category: string
          created_at: string
          due_day: number
          id: string
          interval: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          due_day?: number
          id?: string
          interval?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          due_day?: number
          id?: string
          interval?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      profiles: {
        Row: {
          active_organization_id: string | null
          created_at: string
          display_name: string | null
          household_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active_organization_id?: string | null
          created_at?: string
          display_name?: string | null
          household_id?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          active_organization_id?: string | null
          created_at?: string
          display_name?: string | null
          household_id?: string | null
          id?: string
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
          time: string | null
          total: number
          trace: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
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
          time?: string | null
          total: number
          trace?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
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
          time?: string | null
          total?: number
          trace?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_household: { Args: { _name: string }; Returns: string }
      create_organization: { Args: { _name: string }; Returns: string }
      join_household: { Args: { _code: string }; Returns: string }
      join_organization: { Args: { _code: string }; Returns: string }
      leave_household: { Args: never; Returns: undefined }
      leave_organization: { Args: { _org: string }; Returns: undefined }
      regenerate_org_invite_code: { Args: { _org: string }; Returns: string }
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
