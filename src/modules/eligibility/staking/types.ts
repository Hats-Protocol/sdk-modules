import type { TransactionResult } from "../../../types";

export interface BeginUnstakeResult extends TransactionResult {}

export interface CompleteUnstakeResult extends TransactionResult {}

export interface SlashResult extends TransactionResult {}

export interface StakeResult extends TransactionResult {}

export interface ForgiveResult extends TransactionResult {}

export interface WithdrawResult extends TransactionResult {}

export interface ChangeMinStakeResult extends TransactionResult {}

export interface ChangeJudgeHatResult extends TransactionResult {}

export interface ChangeRecipientHatResult extends TransactionResult {}

export interface ChangeCooldownPeriodResult extends TransactionResult {}
