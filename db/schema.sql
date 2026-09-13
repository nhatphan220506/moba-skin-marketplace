CREATE TABLE IF NOT EXISTS collection_store (
  collection text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS indexed_events (
  chain_id bigint NOT NULL,
  transaction_hash text NOT NULL,
  log_index integer NOT NULL,
  block_number bigint NOT NULL,
  block_hash text NOT NULL,
  contract_name text NOT NULL,
  contract_address text NOT NULL,
  event_name text NOT NULL,
  actor text,
  design_id bigint,
  auction_id bigint,
  token_id bigint,
  amount numeric(78, 0),
  arguments jsonb NOT NULL DEFAULT '{}'::jsonb,
  block_timestamp timestamptz,
  PRIMARY KEY (chain_id, transaction_hash, log_index)
);

CREATE INDEX IF NOT EXISTS indexed_events_design ON indexed_events(chain_id, design_id, block_number);
CREATE INDEX IF NOT EXISTS indexed_events_actor ON indexed_events(chain_id, actor, block_number);

CREATE TABLE IF NOT EXISTS indexer_cursors (
  chain_id bigint PRIMARY KEY,
  last_finalized_block bigint NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS files (
  file_id text PRIMARY KEY,
  design_id bigint NOT NULL,
  category text NOT NULL,
  original_name text NOT NULL,
  storage_uri text NOT NULL,
  sha256 text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification_reports (
  report_id text PRIMARY KEY,
  design_id bigint NOT NULL,
  status text NOT NULL,
  report_hash text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_records (
  production_id text PRIMARY KEY,
  design_id bigint NOT NULL,
  status text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_links (
  wallet_address text PRIMARY KEY,
  encrypted_game_reference text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activations (
  activation_id text PRIMARY KEY,
  wallet_address text NOT NULL,
  token_id bigint NOT NULL,
  state text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
