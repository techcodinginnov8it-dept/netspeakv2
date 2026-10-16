export const STANDARD_REQUIREMENTS = [
  { key: 'BANK_ACCOUNT',          label: 'Bank Account' },
  { key: 'CONTRACT_SIGNING',      label: 'Contract Signing' },
  { key: 'VALID_ID',              label: 'Valid ID' },
  { key: 'PROOF_OF_EDUCATION',    label: 'Proof of Education' },
  { key: 'PROFESSIONAL_PICTURE',  label: 'Professional Picture' },
  { key: 'INTRO_RECORDING',       label: 'Intro Recording' },
  { key: 'NBI_CLEARANCE',         label: 'NBI Clearance' },
  { key: 'SELF_VIDEO_INTRO',      label: 'Self-Video Introduction' },
  { key: 'SK12_TAGGING',          label: 'SK12 Tagging' },
  { key: 'TPCAP_TAGGING',         label: 'TPCAP Tagging' },
  { key: 'SPECIAL_TAGGINGS',      label: 'Additional Special Taggings' },
  { key: 'GLOBAL_TEACHER_TAGGING',label: 'Global Teacher Tagging' },
  { key: 'FLOWERS',               label: 'Flowers' },
  { key: 'SIGNED_DOUBLE_SA',      label: 'Signed Double SA' },
  { key: 'TTP_ORIENTATION',       label: 'TTP Orientation' },
  { key: 'TESOL',                 label: 'TESOL' },
  { key: 'ZTP_TRAINING',          label: 'ZTP Training' },
  { key: 'LEARNING_HUB',          label: 'Learning Hub' },
] as const;

export type StandardRequirementKey = typeof STANDARD_REQUIREMENTS[number]['key'];
