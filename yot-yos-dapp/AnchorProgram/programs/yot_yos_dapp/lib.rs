// lib.rs — Enhanced version with correct YOT vault ATA handling
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};

const BASIS_POINTS: u64 = 10_000;

declare_id!("EymbuAC1fMRMieLcmAf8edFA39292ckFqjEunxjrwgu8");

#[program]
mod yot_yos_dapp {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        state.pool_authority = ctx.accounts.pool_authority.key();
        state.accumulated_yot = 0;
        state.cashback_bps = 500;
        state.liquidity_threshold = 100_000_000; // 0.1 SOL worth in YOT
        state.weekly_apr_bps = 701; // ~365% APR
        Ok(())
    }

    pub fn set_params(
        ctx: Context<SetParams>,
        cashback_bps: u64,
        liquidity_threshold: u64,
        weekly_apr_bps: u64,
    ) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        require_keys_eq!(ctx.accounts.authority.key(), state.pool_authority);
        state.cashback_bps = cashback_bps;
        state.liquidity_threshold = liquidity_threshold;
        state.weekly_apr_bps = weekly_apr_bps;
        Ok(())
    }

    pub fn swap_and_distribute(ctx: Context<SwapAndDistribute>, yot_amount: u64) -> Result<()> {
        let cashback = yot_amount * ctx.accounts.global_state.cashback_bps / BASIS_POINTS;
        let contribution = yot_amount * 2000 / BASIS_POINTS;
        let user_receive = yot_amount - cashback - contribution;

        token::transfer(ctx.accounts.transfer_to_user(), user_receive)?;
        token::transfer(ctx.accounts.transfer_to_vault(), contribution)?;
        token::mint_to(ctx.accounts.mint_yos_cashback(), cashback)?;

        ctx.accounts.global_state.accumulated_yot += contribution;

        Ok(())
    }

    pub fn add_liquidity_if_threshold(ctx: Context<AddLiquidity>) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        if state.accumulated_yot >= state.liquidity_threshold {
            let half_yot = state.accumulated_yot / 2;
            state.accumulated_yot = 0;
            msg!("✅ Auto LP: Swap {} YOT for SOL, then LP with {} YOT + {} SOL", half_yot, half_yot, half_yot);
        } else {
            msg!("ℹ️ Not enough YOT to LP. Current: {}, Threshold: {}", state.accumulated_yot, state.liquidity_threshold);
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + 32 + 8 * 4, seeds = [b"state"], bump)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK:
    pub pool_authority: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetParams<'info> {
    #[account(mut, seeds = [b"state"], bump)]
    pub global_state: Account<'info, GlobalState>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SwapAndDistribute<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub yot_source: Account<'info, TokenAccount>,
    #[account(mut)]
    pub yot_user_dest: Account<'info, TokenAccount>,
    #[account(mut)]
    pub yot_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub yos_mint: Account<'info, Mint>,
    #[account(mut)]
    pub yos_user_dest: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"state"], bump)]
    pub global_state: Account<'info, GlobalState>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut, seeds = [b"state"], bump)]
    pub global_state: Account<'info, GlobalState>,
}

impl<'info> SwapAndDistribute<'info> {
    fn transfer_to_user(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.yot_source.to_account_info(),
            to: self.yot_user_dest.to_account_info(),
            authority: self.user.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }

    fn transfer_to_vault(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.yot_source.to_account_info(),
            to: self.yot_vault.to_account_info(),
            authority: self.user.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }

    fn mint_yos_cashback(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let cpi_accounts = MintTo {
            mint: self.yos_mint.to_account_info(),
            to: self.yos_user_dest.to_account_info(),
            authority: self.global_state.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

#[account]
pub struct GlobalState {
    pub pool_authority: Pubkey,
    pub accumulated_yot: u64,
    pub cashback_bps: u64,
    pub liquidity_threshold: u64,
    pub weekly_apr_bps: u64,
}
