// ============================================
// Supabase Database Type Definitions
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'student' | 'admin' | 'editor';
          status: 'active' | 'paused' | 'deleted';
          avatar_url: string | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
          last_activity_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role?: 'student' | 'admin' | 'editor';
          status?: 'active' | 'paused' | 'deleted';
          avatar_url?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          last_activity_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'student' | 'admin' | 'editor';
          status?: 'active' | 'paused' | 'deleted';
          avatar_url?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          last_activity_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string;
          level: string; // Now allows custom category slugs
          thumbnail_url: string;
          pricing: Json;
          modules: Json;
          is_published: boolean;
          is_draft: boolean;
          draft_data: Json | null;
          published_at: string | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
          // New catalog fields
          product_type: 'ebook' | 'learndash' | 'service';
          target_audience: 'adults_teens' | 'kids';
          content_format: 'pdf' | 'interactive' | 'live' | 'hybrid';
          teaching_materials_price: number | null;
          teaching_materials_included: boolean;
          related_materials_id: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          level: string;
          thumbnail_url: string;
          pricing: Json;
          modules?: Json;
          is_published?: boolean;
          is_draft?: boolean;
          draft_data?: Json | null;
          published_at?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          // New catalog fields
          product_type?: 'ebook' | 'learndash' | 'service';
          target_audience?: 'adults_teens' | 'kids';
          content_format?: 'pdf' | 'interactive' | 'live' | 'hybrid';
          teaching_materials_price?: number | null;
          teaching_materials_included?: boolean;
          related_materials_id?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          level?: string;
          thumbnail_url?: string;
          pricing?: Json;
          modules?: Json;
          is_published?: boolean;
          is_draft?: boolean;
          draft_data?: Json | null;
          published_at?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          // New catalog fields
          product_type?: 'ebook' | 'learndash' | 'service';
          target_audience?: 'adults_teens' | 'kids';
          content_format?: 'pdf' | 'interactive' | 'live' | 'hybrid';
          teaching_materials_price?: number | null;
          teaching_materials_included?: boolean;
          related_materials_id?: string | null;
        };
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          enrolled_at: string;
          status: 'active' | 'completed' | 'revoked';
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          enrolled_at?: string;
          status?: 'active' | 'completed' | 'revoked';
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          enrolled_at?: string;
          status?: 'active' | 'completed' | 'revoked';
          completed_at?: string | null;
        };
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          amount: number;
          currency: string;
          purchased_at: string;
          payment_method: string | null;
          transaction_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          amount: number;
          currency: string;
          purchased_at?: string;
          payment_method?: string | null;
          transaction_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          amount?: number;
          currency?: string;
          purchased_at?: string;
          payment_method?: string | null;
          transaction_id?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          action: string;
          entity_type: 'user' | 'course' | 'module' | 'lesson' | 'homework' | 'enrollment';
          entity_id: string;
          admin_id: string;
          admin_name: string;
          before_data: Json | null;
          after_data: Json | null;
          description: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          action: string;
          entity_type: 'user' | 'course' | 'module' | 'lesson' | 'homework' | 'enrollment';
          entity_id: string;
          admin_id: string;
          admin_name: string;
          before_data?: Json | null;
          after_data?: Json | null;
          description: string;
          timestamp?: string;
        };
        Update: {
          id?: string;
          action?: string;
          entity_type?: 'user' | 'course' | 'module' | 'lesson' | 'homework' | 'enrollment';
          entity_id?: string;
          admin_id?: string;
          admin_name?: string;
          before_data?: Json | null;
          after_data?: Json | null;
          description?: string;
          timestamp?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          type: string;
          user_id: string | null;
          user_name: string | null;
          course_id: string | null;
          course_name: string | null;
          item_id: string | null;
          item_name: string | null;
          admin_id: string | null;
          admin_name: string | null;
          description: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          type: string;
          user_id?: string | null;
          user_name?: string | null;
          course_id?: string | null;
          course_name?: string | null;
          item_id?: string | null;
          item_name?: string | null;
          admin_id?: string | null;
          admin_name?: string | null;
          description: string;
          timestamp?: string;
        };
        Update: {
          id?: string;
          type?: string;
          user_id?: string | null;
          user_name?: string | null;
          course_id?: string | null;
          course_name?: string | null;
          item_id?: string | null;
          item_name?: string | null;
          admin_id?: string | null;
          admin_name?: string | null;
          description?: string;
          timestamp?: string;
        };
      };
      progress: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          lesson_id: string | null;
          homework_id: string | null;
          is_completed: boolean;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          lesson_id?: string | null;
          homework_id?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          lesson_id?: string | null;
          homework_id?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          color: string;
          icon: string | null;
          sort_order: number;
          is_active: boolean;
          catalog_type: 'level' | 'program' | 'section';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          color?: string;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          catalog_type?: 'level' | 'program' | 'section';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          color?: string;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          catalog_type?: 'level' | 'program' | 'section';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
