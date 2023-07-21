export interface ModuleInfo {
  githubRepoOwner: string;
  githubRepoName: string;
  name: string;
  description: string;
}

export interface TransactionResult {
  status: "success" | "reverted";
  transactionHash: `0x${string}`;
}
