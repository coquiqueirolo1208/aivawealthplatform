// Hand-authored to match supabase/migrations/0001_schema.sql + 0002_rls.sql exactly
// (the Supabase CLI's `gen types` needs a local Docker/Podman container for
// introspection even with --db-url, which isn't available in this environment).
// Keep in sync with the migrations by hand until codegen is available.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      advisors: {
        Row: {
          id: string;
          name: string;
          email: string;
          created_at: string;
          logo_path: string | null;
          weekly_email_enabled: boolean;
        };
        Insert: {
          id: string;
          name?: string;
          email: string;
          created_at?: string;
          logo_path?: string | null;
          weekly_email_enabled?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          created_at?: string;
          logo_path?: string | null;
          weekly_email_enabled?: boolean;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          advisor_id: string;
          name: string;
          fecha_nacimiento: string | null;
          direccion: string | null;
          email: string | null;
          celular: string | null;
          pareja: string | null;
          hijos: string | null;
          household_label: string | null;
          is_demo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          advisor_id: string;
          name: string;
          fecha_nacimiento?: string | null;
          direccion?: string | null;
          email?: string | null;
          celular?: string | null;
          pareja?: string | null;
          hijos?: string | null;
          household_label?: string | null;
          is_demo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      client_notes: {
        Row: { id: string; client_id: string; texto: string; created_at: string };
        Insert: { id?: string; client_id: string; texto: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["client_notes"]["Insert"]>;
        Relationships: [];
      };
      client_benchmark_weights: {
        Row: { client_id: string; month: string; msci_pct: number };
        Insert: { client_id: string; month: string; msci_pct: number };
        Update: Partial<Database["public"]["Tables"]["client_benchmark_weights"]["Insert"]>;
        Relationships: [];
      };
      client_documents: {
        Row: {
          id: string;
          client_id: string;
          tipo: string;
          estado: string;
          vencimiento: string | null;
          notas: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          tipo: string;
          estado?: string;
          vencimiento?: string | null;
          notas?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["client_documents"]["Insert"]>;
        Relationships: [];
      };
      risk_profiles: {
        Row: { client_id: string; answers: Json; score: number; profile: string; completed_at: string };
        Insert: {
          client_id: string;
          answers: Json;
          score: number;
          profile: string;
          completed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["risk_profiles"]["Insert"]>;
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          client_id: string;
          label: string;
          custodian: string | null;
          account_number: string | null;
          comentario: string | null;
          titularidad: string | null;
          tod_completado: boolean;
          tod_fecha: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          label: string;
          custodian?: string | null;
          account_number?: string | null;
          comentario?: string | null;
          titularidad?: string | null;
          tod_completado?: boolean;
          tod_fecha?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
        Relationships: [];
      };
      snapshots: {
        Row: {
          id: string;
          account_id: string;
          month: string;
          valor_actual: number | null;
          valor_inicial: number | null;
          valor_activos: number | null;
          valor_pasivos: number | null;
          flujos_netos: number | null;
          flujos_netos_ytd: number | null;
          costos_mes: number | null;
          rent_mtd: number | null;
          rent_mtd_metodo: string | null;
          rent_ytd: number | null;
          rent_ytd_metodo: string | null;
          moneda: string | null;
          tipo_cambio: number | null;
          asignacion: Json;
          holdings: Json;
          highlights: string[];
          movimientos: string[];
        };
        Insert: {
          id?: string;
          account_id: string;
          month: string;
          valor_actual?: number | null;
          valor_inicial?: number | null;
          valor_activos?: number | null;
          valor_pasivos?: number | null;
          flujos_netos?: number | null;
          flujos_netos_ytd?: number | null;
          costos_mes?: number | null;
          rent_mtd?: number | null;
          rent_mtd_metodo?: string | null;
          rent_ytd?: number | null;
          rent_ytd_metodo?: string | null;
          moneda?: string | null;
          tipo_cambio?: number | null;
          asignacion?: Json;
          holdings?: Json;
          highlights?: string[];
          movimientos?: string[];
        };
        Update: Partial<Database["public"]["Tables"]["snapshots"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: { id: string; client_id: string; title: string; due: string | null; done: boolean };
        Insert: { id?: string; client_id: string; title: string; due?: string | null; done?: boolean };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      prospects: {
        Row: {
          id: string;
          advisor_id: string;
          name: string;
          empresa: string | null;
          fuente: string | null;
          aum_estimado: number | null;
          proxima_accion: string | null;
          proxima_fecha: string | null;
          notas: string | null;
          stage: string;
          created_at: string;
          converted_client_id: string | null;
        };
        Insert: {
          id?: string;
          advisor_id: string;
          name: string;
          empresa?: string | null;
          fuente?: string | null;
          aum_estimado?: number | null;
          proxima_accion?: string | null;
          proxima_fecha?: string | null;
          notas?: string | null;
          stage?: string;
          created_at?: string;
          converted_client_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["prospects"]["Insert"]>;
        Relationships: [];
      };
      advisor_metrics: {
        Row: {
          advisor_id: string;
          aum: Json;
          aum_inicio_ano: number | null;
          comisiones_q: number | null;
          entradas_nuevos_clientes: number | null;
          entradas_clientes_existentes: number | null;
          salidas: number | null;
          n_clientes: number | null;
          is_demo: boolean;
        };
        Insert: {
          advisor_id: string;
          aum?: Json;
          aum_inicio_ano?: number | null;
          comisiones_q?: number | null;
          entradas_nuevos_clientes?: number | null;
          entradas_clientes_existentes?: number | null;
          salidas?: number | null;
          n_clientes?: number | null;
          is_demo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["advisor_metrics"]["Insert"]>;
        Relationships: [];
      };
      recommendations_cache: {
        Row: {
          client_id: string;
          fecha: string | null;
          resumen_mercado: string | null;
          cambiar: Json;
          mantener_con_condicion: Json;
          estructurales: Json;
          fingerprint: string | null;
        };
        Insert: {
          client_id: string;
          fecha?: string | null;
          resumen_mercado?: string | null;
          cambiar?: Json;
          mantener_con_condicion?: Json;
          estructurales?: Json;
          fingerprint?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["recommendations_cache"]["Insert"]>;
        Relationships: [];
      };
      meeting_prep_cache: {
        Row: {
          client_id: string;
          text: string | null;
          generated_at: string | null;
          suggestions: string | null;
        };
        Insert: {
          client_id: string;
          text?: string | null;
          generated_at?: string | null;
          suggestions?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["meeting_prep_cache"]["Insert"]>;
        Relationships: [];
      };
      benchmark_levels: {
        Row: { month: string; msci: number | null; agg: number | null };
        Insert: { month: string; msci?: number | null; agg?: number | null };
        Update: Partial<Database["public"]["Tables"]["benchmark_levels"]["Insert"]>;
        Relationships: [];
      };
      daily_reports: {
        Row: {
          id: string;
          date: string;
          title: string | null;
          content: string | null;
          file_path: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          title?: string | null;
          content?: string | null;
          file_path?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_reports"]["Insert"]>;
        Relationships: [];
      };
      funds: {
        Row: {
          isin: string;
          name: string;
          cat: string | null;
          sub: string | null;
          rt: number | null;
          d1: number | null;
          w1: number | null;
          m1: number | null;
          qtd: number | null;
          ytd: number | null;
          y1: number | null;
          y3: number | null;
          y5: number | null;
          si: number | null;
          y2021: number | null;
          y2022: number | null;
          y2023: number | null;
          y2024: number | null;
          y2025: number | null;
          sh3: number | null;
          sh5: number | null;
          aum: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["funds"]["Row"]> & { isin: string; name: string };
        Update: Partial<Database["public"]["Tables"]["funds"]["Row"]>;
        Relationships: [];
      };
      ideas_funds: {
        Row: {
          id: string;
          isin_acc: string | null;
          name: string;
          class: string | null;
          sector: string | null;
          subsector: string | null;
          currency: string | null;
          ytd: number | null;
          ret1y: number | null;
          ret3y: number | null;
          ret5y: number | null;
          min_invest: number | null;
          vol3y: number | null;
          sharpe3y: number | null;
          expense_ratio: number | null;
          dvd_yield: number | null;
          dvd_freq: string | null;
          isin_dist: string | null;
          inception_date: string | null;
          ticker: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["ideas_funds"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["ideas_funds"]["Row"]>;
        Relationships: [];
      };
      ideas_etfs: {
        Row: {
          id: string;
          isin_acc: string | null;
          name: string;
          sector: string | null;
          subsector: string | null;
          ticker_acc: string | null;
          ticker_dist: string | null;
          manager: string | null;
          strategy: string | null;
          inception: string | null;
          total_assets_m: number | null;
          price: number | null;
          ytd: number | null;
          ret1y: number | null;
          ret3y: number | null;
          isin_dist: string | null;
          dvd_yield: number | null;
          cost: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["ideas_etfs"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["ideas_etfs"]["Row"]>;
        Relationships: [];
      };
      ideas_bonds: {
        Row: {
          isin: string;
          issuer: string;
          sector: string | null;
          subsector: string | null;
          maturity: string | null;
          coupon: number | null;
          coupon_type: string | null;
          price: number | null;
          ytm: number | null;
          min_piece: number | null;
          increment: number | null;
          country: string | null;
          seniority: string | null;
          rule144a: string | null;
          rating_sp: string | null;
          rating_moody: string | null;
          duration: number | null;
          callable: string | null;
          next_call: string | null;
          ytc: number | null;
          outstanding: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["ideas_bonds"]["Row"]> & { isin: string; issuer: string };
        Update: Partial<Database["public"]["Tables"]["ideas_bonds"]["Row"]>;
        Relationships: [];
      };
      ideas_stocks: {
        Row: {
          isin: string;
          name: string;
          sector: string | null;
          industry: string | null;
          ticker: string | null;
          currency: string | null;
          price: number | null;
          target_median: number | null;
          exp_growth: number | null;
          dvd_yield: number | null;
          ytd: number | null;
          ret1y: number | null;
          ret3y: number | null;
          ret5y: number | null;
          vol6m: number | null;
          country: string | null;
          mkt_cap_b: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["ideas_stocks"]["Row"]> & { isin: string; name: string };
        Update: Partial<Database["public"]["Tables"]["ideas_stocks"]["Row"]>;
        Relationships: [];
      };
      model_portfolios: {
        Row: { key: string; label: string; cash: number };
        Insert: { key: string; label: string; cash?: number };
        Update: Partial<Database["public"]["Tables"]["model_portfolios"]["Insert"]>;
        Relationships: [];
      };
      model_portfolio_holdings: {
        Row: {
          id: string;
          portfolio_key: string;
          isin: string | null;
          name: string;
          sector: string | null;
          section: string;
          weight: number;
        };
        Insert: {
          id?: string;
          portfolio_key: string;
          isin?: string | null;
          name: string;
          sector?: string | null;
          section: string;
          weight: number;
        };
        Update: Partial<Database["public"]["Tables"]["model_portfolio_holdings"]["Insert"]>;
        Relationships: [];
      };
      investec_solutions: {
        Row: {
          id: string;
          badge: string | null;
          name: string;
          isin: string | null;
          risk: string | null;
          equity_range: string | null;
          alloc_key: string | null;
          yd_key: string | null;
          tipo_rf_key: string | null;
          full_name: string | null;
          evo_key: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["investec_solutions"]["Row"]> & { id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["investec_solutions"]["Row"]>;
        Relationships: [];
      };
      investec_classes: {
        Row: {
          id: string;
          solution_id: string;
          class_name: string;
          isin_acc: string | null;
          isin_dist: string | null;
          management_fee_bps: number | null;
          ter_pct: number | null;
          all_in_pct: number | null;
        };
        Insert: {
          id?: string;
          solution_id: string;
          class_name: string;
          isin_acc?: string | null;
          isin_dist?: string | null;
          management_fee_bps?: number | null;
          ter_pct?: number | null;
          all_in_pct?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["investec_classes"]["Insert"]>;
        Relationships: [];
      };
      reference_data: {
        Row: { key: string; data: Json; updated_at: string };
        Insert: { key: string; data: Json; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["reference_data"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
