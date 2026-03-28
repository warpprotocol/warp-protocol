use anchor_lang::prelude::*;

/// The verdict type assigned to an agent address.
/// Stored as a u8 on-chain for compact representation.
#[derive(
    AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace,
)]
#[repr(u8)]
pub enum VerdictType {
    /// Fully automated agent with no human intervention.
    Autonomous = 0,
    /// Agent that shows a mix of automated and human behavior.
    Hybrid = 1,
    /// Appears to be a human-operated wallet.
    Human = 2,
    /// Not enough data to make a determination.
    InsufficientData = 3,
}

impl TryFrom<u8> for VerdictType {
    type Error = ();

    fn try_from(value: u8) -> std::result::Result<Self, Self::Error> {
        match value {
            0 => Ok(VerdictType::Autonomous),
            1 => Ok(VerdictType::Hybrid),
            2 => Ok(VerdictType::Human),
            3 => Ok(VerdictType::InsufficientData),
            _ => Err(()),
        }
    }
}

/// On-chain attestation account storing the verdict for a single agent address.
/// Derived with seeds ["attestation", agent_address].
#[account]
#[derive(InitSpace)]
pub struct Attestation {
    /// The authority that created and can update this attestation.
    pub authority: Pubkey,

    /// The Solana address of the agent being classified.
    pub agent_address: Pubkey,

    /// The classification verdict.
    pub verdict: VerdictType,

    /// Confidence score in basis points (0-10000, representing 0.00% to 100.00%).
    pub confidence: u16,

    /// Version identifier of the model that produced this verdict.
    /// Encoded as 8 bytes for compact storage.
    pub model_version: [u8; 8],

    /// SHA-256 hash of the feature vector used for classification.
    /// Allows off-chain verification that the same inputs were used.
    pub feature_hash: [u8; 32],

    /// Number of behavioral signals used in this classification.
    pub signal_count: u32,

    /// Number of transactions analyzed for this classification.
    pub transaction_count: u32,

    /// Unix timestamp when the attestation was first created.
    pub created_at: i64,

    /// Unix timestamp when the attestation was last updated.
    pub updated_at: i64,

    /// Solana slot at the time of the last update.
    pub slot: u64,

    /// PDA bump seed for this attestation account.
    pub bump: u8,
}

/// Return value for the query_verdict instruction.
/// Contains a subset of the attestation data relevant to consumers.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VerdictAccount {
    pub agent_address: Pubkey,
    pub verdict: u8,
    pub confidence: u16,
    pub model_version: [u8; 8],
    pub signal_count: u32,
    pub transaction_count: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub slot: u64,
}
