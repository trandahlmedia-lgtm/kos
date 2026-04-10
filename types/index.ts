export type UserRole = 'admin' | 'editor' | 'viewer'
export type ClientTier = 'basic' | 'full_service' | 'website' | 'starter' | 'growth' | 'full_stack'
export type ClientStatus = 'active' | 'paused' | 'churned'
export type Platform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'nextdoor'
export type ContentType = 'offer' | 'seasonal' | 'trust' | 'differentiator' | 'social_proof' | 'education' | 'bts' | 'before_after'
export type PostStatus = 'slot' | 'in_production' | 'ready' | 'scheduled' | 'published'
export type LeadStage = 'new' | 'reached_out' | 'connected' | 'interested' | 'proposal_sent' | 'won' | 'lost'
export type LeadSource = 'cold_call' | 'referral' | 'inbound' | 'scraped' | 'other'
export type LeadHeatLevel = 'hot' | 'good' | 'maybe' | 'cut'
export type EmailStatus = 'draft' | 'queued' | 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced' | 'cancelled'
export type EmailTemplateType = 'initial' | 'followup_1' | 'followup_2' | 'followup_3'
export type SequenceStatus = 'active' | 'paused' | 'completed' | 'opted_out'
export type PriorityTag = 'revenue' | 'delivery' | 'admin' | 'growth'
export type LeadActivityType = 'call' | 'note' | 'stage_change' | 'research_run' | 'conversion' | 'email_drafted' | 'email_sent'
export type PostFormat = 'carousel' | 'static' | 'story_sequence' | 'static_story'
export type PostPlacement = 'feed' | 'story'
export type VisualExportStatus = 'pending' | 'photos_needed' | 'ready_to_export' | 'exported'
export type MediaType = 'image' | 'video' | 'document' | 'audio'
export type MediaCategory = 'brand_asset' | 'creative' | 'footage' | 'export' | 'other'
export type AIWorkflow = 'content_calendar' | 'captions' | 'scripts' | 'design_brief' | 'lead_research' | 'analytics_report' | 'generate_claude_md' | 'platform_bios' | 'client_intake'
export type InvoiceStatus = 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type FilmingStatus = 'planned' | 'completed' | 'cancelled'

export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface BrandLogos {
  icon?: string
  wordmark_dark?: string
  wordmark_light?: string
  full?: string
}

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  website?: string
  tier?: ClientTier
  mrr: number
  contract_start?: string
  primary_producer?: string
  status: ClientStatus
  claude_md: string
  platforms: Platform[]
  posting_frequency: Record<Platform, number>
  ads_eligible: boolean
  ads_eligible_at?: string
  client_since_days?: number
  last_post_at?: string
  brand_logos: BrandLogos | null
  instagram_handle?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  assigned_to: string | null
  business_name: string
  phone: string | null
  email: string | null
  website: string | null
  has_website: boolean
  instagram_handle: string | null
  facebook_url: string | null
  google_business_url: string | null
  other_social_links: string | null
  social_presence_notes: string | null
  years_in_business: number | null
  jobs_per_week: number | null
  work_inflow_notes: string | null
  industry: string | null
  service_area: string | null
  source: LeadSource
  stage: LeadStage
  stage_updated_at: string
  call_notes: string | null
  ai_call_summary: string | null
  ai_score: number | null
  manual_score: number | null
  ai_evaluation: string | null
  ai_recommended_tier: string | null
  ai_recommended_mrr: number | null
  converted_to_client_id: string | null
  converted_at: string | null
  lost_reason: string | null
  notes: string | null
  google_place_id: string | null
  review_count: number | null
  rating: number | null
  heat_level: LeadHeatLevel | null
  priority_tag: PriorityTag | null
  created_at: string
  updated_at: string
}

export interface LeadResearch {
  id: string
  lead_id: string
  website_audit: Record<string, unknown> | null
  social_audit: Record<string, unknown> | null
  business_intel: Record<string, unknown> | null
  service_fit: Record<string, unknown> | null
  pricing_analysis: Record<string, unknown> | null
  full_report: string | null
  overall_score: number | null
  status: 'pending' | 'running' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface LeadActivity {
  id: string
  lead_id: string
  user_id: string | null
  type: LeadActivityType
  content: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Post {
  id: string
  client_id: string
  platform: Platform
  cross_post_platforms: Platform[]
  content_type?: ContentType
  status: PostStatus
  format: PostFormat
  placement: PostPlacement
  caption?: string
  selected_caption_id?: string
  cta?: string
  phone?: string
  hashtags?: string
  // AI-generated content direction (set during angle generation)
  angle?: string
  visual_direction?: string
  caption_brief?: string
  ai_reasoning?: string
  weekly_direction_id?: string
  parent_post_id?: string
  scheduled_date?: string
  scheduled_time?: string
  scheduled_at?: string
  published_at?: string
  assigned_to?: string
  filming_session_id?: string
  has_creative: boolean
  creative_matched_at?: string
  created_by?: string
  created_at: string
  updated_at: string
  captions?: Caption[]
  media?: Media[]
  visual?: PostVisual
}

export interface Caption {
  id: string
  post_id: string
  platform?: Platform
  content: string
  is_selected: boolean
  is_manual: boolean
  // AI's visual analysis notes from the vision pass on the uploaded creative
  visual_notes?: string
  created_at: string
}

export interface Media {
  id: string
  client_id: string
  post_id?: string
  filming_session_id?: string
  file_name: string
  storage_path: string
  thumbnail_path?: string
  optimized_path?: string
  media_type?: MediaType
  file_size_bytes?: number
  mime_type?: string
  category?: MediaCategory
  platform?: Platform
  tags: string[]
  alt_text?: string
  uploaded_by?: string
  created_at: string
}

export interface OnboardingStep {
  id: string
  client_id: string
  step_key: string
  title: string
  description?: string
  assigned_to?: string
  completed: boolean
  completed_at?: string
  completed_by?: string
  sort_order: number
  created_at: string
}

export interface PlatformSetup {
  id: string
  client_id: string
  platform: Platform
  profile_photo_done: boolean
  bio_done: boolean
  contact_info_done: boolean
  link_done: boolean
  cover_image_done: boolean
  brand_kit_applied: boolean
  verified_at?: string
  notes?: string
  created_at: string
}

export interface FilmingSession {
  id: string
  client_id: string
  scheduled_date?: string
  scheduled_time?: string
  location?: string
  status: FilmingStatus
  scripts_ready: boolean
  gear_packed: boolean
  shot_list?: string
  footage_captured: boolean
  editing_done: boolean
  posts_linked: number
  session_notes?: string
  created_at: string
}

export interface AIRun {
  id: string
  client_id?: string
  lead_id?: string
  post_id?: string
  user_id?: string
  workflow: AIWorkflow
  model: string
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  cost_usd?: number
  status: 'running' | 'completed' | 'failed'
  output_summary?: string
  error_message?: string
  duration_ms?: number
  created_at: string
}

// ---------------------------------------------------------------------------
// Visual engine types
// ---------------------------------------------------------------------------

export interface PhotoSlot {
  slot_id: string
  label: string
  description: string
  has_photo: boolean
  base64_data?: string
  mime_type?: string
}

export interface ColorPalette {
  brand_primary: string
  brand_accent: string
  accent_light: string
  brand_light: string
  brand_dark: string
  light_bg: string
  light_border: string
  dark_bg: string
}

export interface FontPair {
  heading: string
  body: string
}

export interface DirectSlide {
  index: number
  inner_html: string
  background: 'dark' | 'light' | 'gradient'
  has_arrow: boolean
  logo_placement: 'full' | 'icon' | 'wordmark' | 'none'
  photo_slots: string[]
}

export interface SlideContent {
  index: number
  layout_type: string
  background: 'light' | 'dark' | 'gradient'
  tag_label?: string
  heading: string
  body?: string
  stat?: { number: string; label: string }
  features?: Array<{ icon: string; label: string; description: string }>
  steps?: Array<{ number: string; title: string; description: string }>
  quote?: string
  comparison?: { left: { label: string; items: string[] }; right: { label: string; items: string[] } }
  photo_slots?: PhotoSlot[]
  cta?: { text: string; subtitle?: string }
  logo_placement?: 'full' | 'icon' | 'wordmark' | 'none'
  has_arrow: boolean
}

export interface CreativeBrief {
  slides: SlideContent[]
  caption: string
  hashtags: string
  cta_text: string
}

export interface PostVisual {
  id: string
  post_id: string
  client_id: string
  generated_html: string | null
  creative_brief: CreativeBrief | null
  layout_recipe: string[] | null
  slide_count: number | null
  color_palette: ColorPalette | null
  photo_slots: PhotoSlot[] | null
  font_pair: FontPair | null
  export_status: VisualExportStatus
  exported_at: string | null
  notes: string | null
  slide_html?: DirectSlide[] | null
  generation_mode?: 'template' | 'direct'
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// AI Workflow response types
// ---------------------------------------------------------------------------

export interface WeeklyPlanPost {
  scheduled_date: string
  scheduled_time: string
  platform: Platform
  cross_post_platforms: Platform[]
  content_type: ContentType
  format: PostFormat
  placement: PostPlacement
  angle: string
  visual_direction: string
  caption_brief: string
  ai_reasoning: string
}

export interface CaptionOption {
  content: string
  tone: string
  hook: string
}

export interface GeneratedCaptions {
  best: CaptionOption
  alternatives: CaptionOption[]
}

export interface ClientTask {
  id: string
  client_id: string
  title: string
  completed: boolean
  completed_at?: string
  sort_order: number
  created_by?: string
  created_at: string
}

export interface AgencyTask {
  id: string
  title: string
  completed: boolean
  completed_at?: string
  sort_order: number
  created_by?: string
  created_at: string
}

export interface WeeklyDirection {
  id: string
  client_id: string
  week_start_date: string
  direction_text: string
  post_count_override?: number
  created_by?: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Outreach types
// ---------------------------------------------------------------------------

export interface OutreachEmail {
  id: string
  lead_id: string
  subject: string
  body_html: string
  body_text: string
  status: EmailStatus
  template_type: EmailTemplateType
  follow_up_number: number
  scheduled_send_at: string | null
  sent_at: string | null
  opened_at: string | null
  replied_at: string | null
  bounced_at: string | null
  resend_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface OutreachSequence {
  id: string
  lead_id: string
  status: SequenceStatus
  current_step: number
  next_send_at: string | null
  created_at: string
  updated_at: string
}

export interface EmailOptOut {
  email: string
  opted_out_at: string
  source: 'disqualify' | 'unsubscribe'
}

export interface OutreachSettings {
  id: string
  user_id: string
  from_name: string
  from_email: string
  reply_to: string
  daily_limit: number
  score_threshold: number
  business_address: string
  sending_enabled: boolean
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// AI Workflow response types
// ---------------------------------------------------------------------------

export interface ClientIntakeResult {
  name: string
  industry: string
  service_area: string
  phone?: string
  email?: string
  website?: string
  services: string[]
  recommended_tier: string
  estimated_mrr: number
  tier_reasoning: string
  flags: string[]
  existing_social_presence?: {
    summary: string
    platforms?: string[]
  }
  confidence?: {
    overall: string
    notes: string
  }
}