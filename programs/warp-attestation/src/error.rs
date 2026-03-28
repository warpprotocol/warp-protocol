use anchor_lang::prelude::*;

#[error_code]
pub enum WarpError {
    /// The provided verdict type value is not recognized.
    /// Must be 0 (Autonomous), 1 (Hybrid), 2 (Human), or 3 (InsufficientData).
    #[msg("Invalid verdict type. Must be 0, 1, 2, or 3.")]
    InvalidVerdictType,

    /// The confidence value exceeds the maximum of 10000 basis points.
    #[msg("Confidence must be between 0 and 10000 (basis points).")]
    ConfidenceOutOfRange,

    /// The caller is not the authority that created this attestation.
    #[msg("Only the original authority can update or close this attestation.")]
    UnauthorizedAuthority,

    /// The signal count must be greater than zero for a valid attestation.
    #[msg("At least one signal is required to create an attestation.")]
    InsufficientSignals,

    /// The attestation account for this agent already exists.
    #[msg("An attestation for this agent address already exists.")]
    AttestationAlreadyExists,

    /// The model version bytes are invalid or unrecognized.
    #[msg("The provided model version identifier is not valid.")]
    InvalidModelVersion,

    /// The feature hash does not match the expected format.
    #[msg("Feature hash must be a valid 32-byte SHA-256 digest.")]
    InvalidFeatureHash,
}
