import { ethers } from 'ethers';
import config from '../../config';
import { getProvider } from '../../provider';
import { findUserById } from '../../repositories/userRepository';
import { User } from '../../entities/user';
import { logger } from '../../utils/logger';
const PRIVADO_VERIFIER_NETWORK_ID = +config.get(
  'PRIVADO_VERIFIER_NETWORK_ID',
) as number;
const PRIVADO_VERIFIER_CONTRACT_ADDRESS = config.get(
  'PRIVADO_VERIFIER_CONTRACT_ADDRESS',
) as string;
const PRIVADO_REQUEST_ID = +config.get('PRIVADO_REQUEST_ID') as number;

logger.debug('Privado Request ID', { PRIVADO_REQUEST_ID });
export class PrivadoAdapter {
  private provider;

  constructor() {
    this.provider = getProvider(PRIVADO_VERIFIER_NETWORK_ID);
  }

  private async checkVerificationOnchain(address: string): Promise<boolean> {
    const abi = [
      {
        inputs: [
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'uint64', name: 'requestId', type: 'uint64' },
        ],
        name: 'isProofVerified',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
      },
    ];

    const contract = new ethers.Contract(
      PRIVADO_VERIFIER_CONTRACT_ADDRESS,
      abi,
      this.provider,
    );
    return contract.isProofVerified(address, PrivadoAdapter.privadoRequestId());
  }

  async checkUserVerified(userId: number): Promise<boolean> {
    logger.debug('Checking Privado verification for user', { userId });

    const user = await findUserById(userId);
    if (!user || !user.walletAddress) {
      throw new Error('No user or wallet address');
    }

    if (PrivadoAdapter.isUserVerified(user)) {
      return true;
    }

    const response = await this.checkVerificationOnchain(user.walletAddress);
    if (response) {
      user.privadoVerifiedRequestIds = [
        PrivadoAdapter.privadoRequestId(),
        ...user.privadoVerifiedRequestIds,
      ];
      await user.save();
    }
    return response;
  }

  static isUserVerified(user: User): boolean {
    return (
      user?.privadoVerifiedRequestIds.includes(
        PrivadoAdapter.privadoRequestId(),
      ) || false
    );
  }
  static privadoRequestId(): number {
    return PRIVADO_REQUEST_ID;
  }
}
