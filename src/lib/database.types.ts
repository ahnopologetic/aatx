export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instanciate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "12.2.3 (519615d)"
    }
    public: {
        Tables: {
            app_states: {
                Row: {
                    app_name: string
                    state: Json
                    update_time: string
                }
                Insert: {
                    app_name: string
                    state: Json
                    update_time: string
                }
                Update: {
                    app_name?: string
                    state?: Json
                    update_time?: string
                }
                Relationships: []
            }
            event_annotations: {
                Row: {
                    annotation: string | null
                    created_at: string | null
                    id: string
                    updated_at: string | null
                    user_event_id: string | null
                    user_id: string | null
                }
                Insert: {
                    annotation?: string | null
                    created_at?: string | null
                    id: string
                    updated_at?: string | null
                    user_event_id?: string | null
                    user_id?: string | null
                }
                Update: {
                    annotation?: string | null
                    created_at?: string | null
                    id?: string
                    updated_at?: string | null
                    user_event_id?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "event_annotations_user_event_id_fkey"
                        columns: ["user_event_id"]
                        isOneToOne: false
                        referencedRelation: "user_events"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "event_annotations_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            events: {
                Row: {
                    actions: string
                    app_name: string
                    author: string
                    branch: string | null
                    content: Json | null
                    error_code: string | null
                    error_message: string | null
                    grounding_metadata: Json | null
                    id: string
                    interrupted: boolean | null
                    invocation_id: string
                    long_running_tool_ids_json: string | null
                    partial: boolean | null
                    session_id: string
                    timestamp: string
                    turn_complete: boolean | null
                    user_id: string
                }
                Insert: {
                    actions: string
                    app_name: string
                    author: string
                    branch?: string | null
                    content?: Json | null
                    error_code?: string | null
                    error_message?: string | null
                    grounding_metadata?: Json | null
                    id: string
                    interrupted?: boolean | null
                    invocation_id: string
                    long_running_tool_ids_json?: string | null
                    partial?: boolean | null
                    session_id: string
                    timestamp: string
                    turn_complete?: boolean | null
                    user_id: string
                }
                Update: {
                    actions?: string
                    app_name?: string
                    author?: string
                    branch?: string | null
                    content?: Json | null
                    error_code?: string | null
                    error_message?: string | null
                    grounding_metadata?: Json | null
                    id?: string
                    interrupted?: boolean | null
                    invocation_id?: string
                    long_running_tool_ids_json?: string | null
                    partial?: boolean | null
                    session_id?: string
                    timestamp?: string
                    turn_complete?: boolean | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "events_app_name_user_id_session_id_fkey"
                        columns: ["app_name", "user_id", "session_id"]
                        isOneToOne: false
                        referencedRelation: "sessions"
                        referencedColumns: ["app_name", "user_id", "id"]
                    },
                ]
            }
            plan_repos: {
                Row: {
                    created_at: string | null
                    id: string
                    plan_id: string
                    repo_id: string
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    id: string
                    plan_id: string
                    repo_id: string
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    plan_id?: string
                    repo_id?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "plan_repos_plan_id_fkey"
                        columns: ["plan_id"]
                        isOneToOne: false
                        referencedRelation: "plans"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "plan_repos_repo_id_fkey"
                        columns: ["repo_id"]
                        isOneToOne: false
                        referencedRelation: "repos"
                        referencedColumns: ["id"]
                    },
                ]
            }
            plans: {
                Row: {
                    created_at: string | null
                    description: string | null
                    id: string
                    import_source: string | null
                    name: string
                    status: string | null
                    updated_at: string | null
                    user_id: string | null
                    version: string | null
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    id: string
                    import_source?: string | null
                    name: string
                    status?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                    version?: string | null
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    import_source?: string | null
                    name?: string
                    status?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                    version?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "plans_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    created_at: string | null
                    github_token: string | null
                    id: string
                    name: string | null
                    updated_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string | null
                    github_token?: string | null
                    id: string
                    name?: string | null
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string | null
                    github_token?: string | null
                    id?: string
                    name?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            repos: {
                Row: {
                    created_at: string | null
                    description: string | null
                    id: string
                    label: string | null
                    name: string
                    session_id: string | null
                    updated_at: string | null
                    url: string | null
                    user_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    id: string
                    label?: string | null
                    name: string
                    session_id?: string | null
                    updated_at?: string | null
                    url?: string | null
                    user_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    label?: string | null
                    name?: string
                    session_id?: string | null
                    updated_at?: string | null
                    url?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "repos_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            scan_jobs: {
                Row: {
                    created_at: string | null
                    error_message: string | null
                    finished_at: string | null
                    id: string
                    repo_id: string | null
                    started_at: string | null
                    status: string | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    error_message?: string | null
                    finished_at?: string | null
                    id: string
                    repo_id?: string | null
                    started_at?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    error_message?: string | null
                    finished_at?: string | null
                    id?: string
                    repo_id?: string | null
                    started_at?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "scan_jobs_repo_id_fkey"
                        columns: ["repo_id"]
                        isOneToOne: false
                        referencedRelation: "repos"
                        referencedColumns: ["id"]
                    },
                ]
            }
            sessions: {
                Row: {
                    app_name: string
                    create_time: string
                    id: string
                    state: Json
                    update_time: string
                    user_id: string
                }
                Insert: {
                    app_name: string
                    create_time: string
                    id: string
                    state: Json
                    update_time: string
                    user_id: string
                }
                Update: {
                    app_name?: string
                    create_time?: string
                    id?: string
                    state?: Json
                    update_time?: string
                    user_id?: string
                }
                Relationships: []
            }
            user_event_plans: {
                Row: {
                    created_at: string | null
                    id: string
                    plan_id: string
                    updated_at: string | null
                    user_event_id: string
                }
                Insert: {
                    created_at?: string | null
                    id: string
                    plan_id: string
                    updated_at?: string | null
                    user_event_id: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    plan_id?: string
                    updated_at?: string | null
                    user_event_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "user_event_plans_plan_id_fkey"
                        columns: ["plan_id"]
                        isOneToOne: false
                        referencedRelation: "plans"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "user_event_plans_user_event_id_fkey"
                        columns: ["user_event_id"]
                        isOneToOne: false
                        referencedRelation: "user_events"
                        referencedColumns: ["id"]
                    },
                ]
            }
            user_events: {
                Row: {
                    context: string | null
                    created_at: string | null
                    event_name: string
                    file_path: string | null
                    id: string
                    line_number: number | null
                    repo_id: string | null
                    tags: string[] | null
                    updated_at: string | null
                }
                Insert: {
                    context?: string | null
                    created_at?: string | null
                    event_name: string
                    file_path?: string | null
                    id: string
                    line_number?: number | null
                    repo_id?: string | null
                    tags?: string[] | null
                    updated_at?: string | null
                }
                Update: {
                    context?: string | null
                    created_at?: string | null
                    event_name?: string
                    file_path?: string | null
                    id?: string
                    line_number?: number | null
                    repo_id?: string | null
                    tags?: string[] | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "user_events_repo_id_fkey"
                        columns: ["repo_id"]
                        isOneToOne: false
                        referencedRelation: "repos"
                        referencedColumns: ["id"]
                    },
                ]
            }
            user_github_tokens: {
                Row: {
                    github_token: string
                    id: string
                    inserted_at: string | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    github_token: string
                    id?: string
                    inserted_at?: string | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    github_token?: string
                    id?: string
                    inserted_at?: string | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            user_states: {
                Row: {
                    app_name: string
                    state: Json
                    update_time: string
                    user_id: string
                }
                Insert: {
                    app_name: string
                    state: Json
                    update_time: string
                    user_id: string
                }
                Update: {
                    app_name?: string
                    state?: Json
                    update_time?: string
                    user_id?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
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
        Enums: {},
    },
} as const
