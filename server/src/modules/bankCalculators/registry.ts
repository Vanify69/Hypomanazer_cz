import type { BankCalculatorCode } from "../../lib/prisma.js";
import type { BankAdapter } from "./adapters/adapterTypes.js";
import { RbAdapter } from "./adapters/rbAdapter.js";
import { UcbAdapter } from "./adapters/ucbAdapter.js";

export class BankAdapterRegistry {
  private readonly adapters = new Map<BankCalculatorCode, BankAdapter>();

  constructor() {
    this.register(new RbAdapter());
    this.register(new UcbAdapter());
  }

  register(adapter: BankAdapter): void {
    this.adapters.set(adapter.bankCode, adapter);
  }

  get(code: BankCalculatorCode): BankAdapter | undefined {
    return this.adapters.get(code);
  }

  /** Podporované banky v pořadí pro hromadný přepočet. */
  supportedBanks(): BankCalculatorCode[] {
    return [...this.adapters.keys()];
  }
}

export const bankAdapterRegistry = new BankAdapterRegistry();
