-- ============================================================
-- FootManager Online - Migration 003: Social Tables
-- ============================================================

-- ============================================================
-- MESSAGES (private)
-- ============================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  to_coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'personal' CHECK (message_type IN ('personal','transfer_offer','club_proposal','system','notification')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  thread_id UUID, -- for grouping conversations
  related_offer_id UUID REFERENCES public.offers(id),
  related_proposal_id UUID REFERENCES public.club_proposals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_message CHECK (from_coach_id != to_coach_id)
);

CREATE INDEX idx_messages_to ON public.messages(to_coach_id, is_read, created_at DESC);
CREATE INDEX idx_messages_from ON public.messages(from_coach_id, created_at DESC);
CREATE INDEX idx_messages_thread ON public.messages(thread_id, created_at);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('match_result','transfer_offer','transfer_accepted','transfer_rejected','injury','contract_expiring','market_bid','auction_outbid','achievement','system','season_end','competition_result','message')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id_a UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  coach_id_b UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  requested_by UUID NOT NULL REFERENCES public.coaches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_friendship CHECK (coach_id_a != coach_id_b),
  UNIQUE(coach_id_a, coach_id_b)
);

-- ============================================================
-- CHAT ROOMS
-- ============================================================
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'global' CHECK (type IN ('global','national','league','private')),
  scope TEXT, -- country or league name for scoped rooms
  icon TEXT DEFAULT '💬',
  max_members INTEGER DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default chat rooms
INSERT INTO public.chat_rooms (name, type, scope, icon) VALUES
  ('Chat Global', 'global', NULL, '🌍'),
  ('Mercado Global', 'global', NULL, '💹'),
  ('Brasil', 'national', 'BR', '🇧🇷'),
  ('Premier League', 'league', 'England - Premier League', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
  ('La Liga', 'league', 'Spain - La Liga', '🇪🇸'),
  ('Serie A', 'league', 'Italy - Serie A', '🇮🇹'),
  ('Bundesliga', 'league', 'Germany - Bundesliga', '🇩🇪');

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) BETWEEN 1 AND 500),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room ON public.chat_messages(room_id, created_at DESC);

-- ============================================================
-- AUDIT LOG (security)
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON public.audit_logs(action, created_at DESC);

-- ============================================================
-- ADMIN ACTIONS
-- ============================================================
CREATE TABLE public.admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES public.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('punish_coach','reset_season','edit_player','edit_club','ban_user','unban_user','force_transfer','edit_finances','import_data','other')),
  target_type TEXT,
  target_id UUID,
  reason TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DATA IMPORTS (for admin CSV/JSON imports)
-- ============================================================
CREATE TABLE public.data_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES public.users(id),
  import_type TEXT NOT NULL CHECK (import_type IN ('clubs','players','leagues','competitions','squads','full')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  total_records INTEGER NOT NULL DEFAULT 0,
  processed_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]',
  source_file TEXT,
  source_url TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
