// Hand-written to match supabase/migrations/0001_init.sql.
// Once the project is linked, regenerate with `pnpm db:types` and this
// file becomes redundant with the Supabase CLI's own output — kept in
// this shape (Database / Tables / Row) so that swap is a no-op for
// every place that imports from this package.

export type Role = "crew" | "ic";
export type ReminderType = "opening" | "weekly_nudge";

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["departments"]["Insert"]>;
        Relationships: [];
      };
      people: {
        Row: {
          id: string;
          department_id: string;
          full_name: string;
          telegram_handle: string | null;
          telegram_id: number | null;
          invite_code: string | null;
          role: Role;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          full_name: string;
          telegram_handle?: string | null;
          telegram_id?: number | null;
          invite_code?: string | null;
          role: Role;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["people"]["Insert"]>;
        Relationships: [];
      };
      availability_cycles: {
        Row: {
          id: string;
          department_id: string;
          cycle_month: string;
          opens_at: string;
          deadline_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          cycle_month: string;
          opens_at: string;
          deadline_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["availability_cycles"]["Insert"]>;
        Relationships: [];
      };
      service_dates: {
        Row: {
          id: string;
          cycle_id: string;
          service_date: string;
          label: string | null;
        };
        Insert: {
          id?: string;
          cycle_id: string;
          service_date: string;
          label?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["service_dates"]["Insert"]>;
        Relationships: [];
      };
      availability_responses: {
        Row: {
          id: string;
          cycle_id: string;
          person_id: string;
          service_date_id: string;
          is_available: boolean;
          note: string | null;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cycle_id: string;
          person_id: string;
          service_date_id: string;
          is_available: boolean;
          note?: string | null;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["availability_responses"]["Insert"]>;
        Relationships: [];
      };
      reminder_log: {
        Row: {
          id: string;
          cycle_id: string;
          person_id: string;
          reminder_type: ReminderType;
          sent_at: string;
        };
        Insert: {
          id?: string;
          cycle_id: string;
          person_id: string;
          reminder_type: ReminderType;
          sent_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reminder_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type Department = Database["public"]["Tables"]["departments"]["Row"];
export type Person = Database["public"]["Tables"]["people"]["Row"];
export type AvailabilityCycle = Database["public"]["Tables"]["availability_cycles"]["Row"];
export type ServiceDate = Database["public"]["Tables"]["service_dates"]["Row"];
export type AvailabilityResponse = Database["public"]["Tables"]["availability_responses"]["Row"];
export type ReminderLog = Database["public"]["Tables"]["reminder_log"]["Row"];
