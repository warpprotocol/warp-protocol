use anchor_lang::prelude::*;

pub mod error;
pub mod state;

use error::WarpError;
use state::{Attestation, VerdictAccount, VerdictType};

declare_id!("WarpAttest111111111111111111111111111111111");

#[program]
pub mod warp_attestation {
    use super::*;

    /// Create a new attestation for an agent address. Only the authorized
    /// verifier can call this instruction. The attestation stores the
    /// verdict type, confidence score, model version, and feature hash.
    pub fn create_attestation(
        ctx: Context<CreateAttestation>,
        agent_address: Pubkey,
        verdict: u8,
        confidence: u16,
        model_version: [u8; 8],
        feature_hash: [u8; 32],
        signal_count: u32,
        transaction_count: u32,
    ) -> Result<()> {
        let attestation = &mut ctx.accounts.attestation;
        let clock = Clock::get()?;

        let verdict_type = VerdictType::try_from(verdict)
            .map_err(|_| WarpError::InvalidVerdictType)?;

        require!(
            confidence <= 10000,
            WarpError::ConfidenceOutOfRange
        );

        require!(
            signal_count > 0,
            WarpError::InsufficientSignals
        );

        attestation.authority = ctx.accounts.authority.key();
        attestation.agent_address = agent_address;
        attestation.verdict = verdict_type;
        attestation.confidence = confidence;
        attestation.model_version = model_version;
        attestation.feature_hash = feature_hash;
        attestation.signal_count = signal_count;
        attestation.transaction_count = transaction_count;
        attestation.created_at = clock.unix_timestamp;
        attestation.updated_at = clock.unix_timestamp;
        attestation.slot = clock.slot;
        attestation.bump = ctx.bumps.attestation;

        emit!(AttestationCreated {
            agent_address,
            verdict: verdict_type as u8,
            confidence,
            slot: clock.slot,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Attestation created for agent {} with verdict {} (confidence: {})",
            agent_address,
            verdict,
            confidence
        );

        Ok(())
    }

    /// Update an existing attestation with a new verdict. Only the original
    /// authority can update the attestation. Emits an event if the verdict
    /// changed from the previous value.
    pub fn update_attestation(
        ctx: Context<UpdateAttestation>,
        verdict: u8,
        confidence: u16,
        model_version: [u8; 8],
        feature_hash: [u8; 32],
        signal_count: u32,
        transaction_count: u32,
    ) -> Result<()> {
        let attestation = &mut ctx.accounts.attestation;
        let clock = Clock::get()?;

        let new_verdict = VerdictType::try_from(verdict)
            .map_err(|_| WarpError::InvalidVerdictType)?;

        require!(
            confidence <= 10000,
            WarpError::ConfidenceOutOfRange
        );

        let old_verdict = attestation.verdict;

        attestation.verdict = new_verdict;
        attestation.confidence = confidence;
        attestation.model_version = model_version;
        attestation.feature_hash = feature_hash;
        attestation.signal_count = signal_count;
        attestation.transaction_count = transaction_count;
        attestation.updated_at = clock.unix_timestamp;
        attestation.slot = clock.slot;

        if old_verdict != new_verdict {
            emit!(VerdictChanged {
                agent_address: attestation.agent_address,
                old_verdict: old_verdict as u8,
                new_verdict: new_verdict as u8,
                confidence,
                slot: clock.slot,
                timestamp: clock.unix_timestamp,
            });
        }

        Ok(())
    }

    /// Query the current verdict for a given agent address.
    /// Returns the attestation data via the return value.
    pub fn query_verdict(ctx: Context<QueryVerdict>) -> Result<VerdictAccount> {
        let attestation = &ctx.accounts.attestation;

        Ok(VerdictAccount {
            agent_address: attestation.agent_address,
            verdict: attestation.verdict as u8,
            confidence: attestation.confidence,
            model_version: attestation.model_version,
            signal_count: attestation.signal_count,
            transaction_count: attestation.transaction_count,
            created_at: attestation.created_at,
            updated_at: attestation.updated_at,
            slot: attestation.slot,
        })
    }

    /// Close an attestation account and reclaim the rent.
    /// Only the original authority can close the attestation.
    pub fn close_attestation(_ctx: Context<CloseAttestation>) -> Result<()> {
        msg!("Attestation account closed");
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(agent_address: Pubkey)]
pub struct CreateAttestation<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Attestation::INIT_SPACE,
        seeds = [b"attestation", agent_address.as_ref()],
        bump,
    )]
    pub attestation: Account<'info, Attestation>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAttestation<'info> {
    #[account(
        mut,
        has_one = authority @ WarpError::UnauthorizedAuthority,
    )]
    pub attestation: Account<'info, Attestation>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct QueryVerdict<'info> {
    pub attestation: Account<'info, Attestation>,
}

#[derive(Accounts)]
pub struct CloseAttestation<'info> {
    #[account(
        mut,
        close = authority,
        has_one = authority @ WarpError::UnauthorizedAuthority,
    )]
    pub attestation: Account<'info, Attestation>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[event]
pub struct AttestationCreated {
    pub agent_address: Pubkey,
    pub verdict: u8,
    pub confidence: u16,
    pub slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct VerdictChanged {
    pub agent_address: Pubkey,
    pub old_verdict: u8,
    pub new_verdict: u8,
    pub confidence: u16,
    pub slot: u64,
    pub timestamp: i64,
}
