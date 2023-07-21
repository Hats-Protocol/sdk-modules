export class ChainIdMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChainIdMismatchError";
  }
}

export class MissingPublicClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingPublicClientError";
  }
}

export class MissingWalletClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingWalletClientError";
  }
}

export class TransactionRevertedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionRevertedError";
  }
}
