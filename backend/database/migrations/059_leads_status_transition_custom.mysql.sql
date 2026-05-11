ALTER TABLE leads
  ADD COLUMN status_transition_custom TEXT NULL
  COMMENT 'Optional free-text saved only when lead status is updated via workflow';
