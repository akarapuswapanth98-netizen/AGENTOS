export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          theme: string
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          theme?: string
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          theme?: string
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string | null
          role: 'owner' | 'admin' | 'member' | 'viewer'
          invited_email: string | null
          invite_token: string | null
          status: 'active' | 'invited' | 'declined'
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id?: string | null
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          invited_email?: string | null
          invite_token?: string | null
          status?: 'active' | 'invited' | 'declined'
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string | null
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          invited_email?: string | null
          invite_token?: string | null
          status?: 'active' | 'invited' | 'declined'
          created_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          role: string
          avatar_color: string
          is_archived: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          role?: string
          avatar_color?: string
          is_archived?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          role?: string
          avatar_color?: string
          is_archived?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_versions: {
        Row: {
          id: string
          agent_id: string
          version_number: number
          model_provider: 'anthropic' | 'openai' | 'gemini' | 'groq'
          model_name: string
          temperature: number
          system_prompt: string
          workflow_graph: Json
          tools: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          version_number: number
          model_provider?: 'anthropic' | 'openai' | 'gemini' | 'groq'
          model_name?: string
          temperature?: number
          system_prompt: string
          workflow_graph?: Json
          tools?: Json
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          version_number?: number
          model_provider?: 'anthropic' | 'openai' | 'gemini' | 'groq'
          model_name?: string
          temperature?: number
          system_prompt?: string
          workflow_graph?: Json
          tools?: Json
          created_by?: string | null
          created_at?: string
        }
      }
      runs: {
        Row: {
          id: string
          workspace_id: string
          agent_id: string
          agent_version_id: string
          triggered_by: string | null
          trigger_type: 'manual' | 'schedule' | 'webhook' | 'api' | 'workflow'
          status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled'
          input_data: Json
          output_data: Json | null
          error_message: string | null
          total_tokens: number
          prompt_tokens: number
          completion_tokens: number
          cost_usd: number
          latency_ms: number
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          agent_id: string
          agent_version_id: string
          triggered_by?: string | null
          trigger_type?: 'manual' | 'schedule' | 'webhook' | 'api' | 'workflow'
          status?: 'queued' | 'running' | 'success' | 'failed' | 'cancelled'
          input_data?: Json
          output_data?: Json | null
          error_message?: string | null
          total_tokens?: number
          prompt_tokens?: number
          completion_tokens?: number
          cost_usd?: number
          latency_ms?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          agent_id?: string
          agent_version_id?: string
          triggered_by?: string | null
          trigger_type?: 'manual' | 'schedule' | 'webhook' | 'api' | 'workflow'
          status?: 'queued' | 'running' | 'success' | 'failed' | 'cancelled'
          input_data?: Json
          output_data?: Json | null
          error_message?: string | null
          total_tokens?: number
          prompt_tokens?: number
          completion_tokens?: number
          cost_usd?: number
          latency_ms?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      run_logs: {
        Row: {
          id: number
          run_id: string
          agent_node_id: string | null
          step_index: number
          level: 'debug' | 'info' | 'warn' | 'error'
          message: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          run_id: string
          agent_node_id?: string | null
          step_index?: number
          level?: 'debug' | 'info' | 'warn' | 'error'
          message: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          run_id?: string
          agent_node_id?: string | null
          step_index?: number
          level?: 'debug' | 'info' | 'warn' | 'error'
          message?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          title: string
          description: string
          role: string
          category: string
          difficulty: string
          skills: string[]
          workflow_graph: Json
          is_public: boolean
          created_at: string
        }
      }
      knowledge_documents: {
        Row: {
          id: string
          workspace_id: string
          title: string
          file_path: string
          file_type: string
          file_size_bytes: number
          chunk_count: number
          status: 'processing' | 'ready' | 'failed'
          created_by: string | null
          created_at: string
        }
      }
      schedules: {
        Row: {
          id: string
          workspace_id: string
          agent_id: string
          name: string
          cron_expression: string
          input_payload: Json
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          created_at: string
        }
      }
      webhooks: {
        Row: {
          id: string
          workspace_id: string
          agent_id: string
          name: string
          secret_hash: string
          is_active: boolean
          created_at: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          workspace_id: string | null
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error'
          read: boolean
          action_url: string | null
          created_at: string
        }
      }
    }
  }
}
