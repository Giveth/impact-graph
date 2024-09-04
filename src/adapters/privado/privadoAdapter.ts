import { ethers } from 'ethers';
import config from '../../config';
import { getProvider } from '../../provider';
import { IPrivadoAdapter } from './privadoAdapterInterface';
import { findUserById } from '../../repositories/userRepository';
const PRIVADO_VERIFIER_NETWORK_ID = +config.get(
  'PRIVADO_VERIFIER_NETWORK_ID',
) as number;
const PRIVADO_VERIFIER_CONTRACT_ADDRESS = config.get(
  'PRIVADO_VERIFIER_CONTRACT_ADDRESS',
) as string;
const PRIVADO_REQUEST_ID = +config.get('PRIVADO_REQUEST_ID') as number;
export class PrivadoAdapter implements IPrivadoAdapter {
  private async checkVerificationOnchain(address: string): Promise<boolean> {
    const provider = getProvider(PRIVADO_VERIFIER_NETWORK_ID);
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
      provider,
    );
    return contract.isProofVerified(address, this.privadoRequestId());
  }

  async checkUserVerified(userId: number): Promise<boolean> {
    const user = await findUserById(userId);
    const requestId = this.privadoRequestId();
    if (!user || !user.walletAddress) {
      throw new Error('No user or wallet address');
    }

    if (user.privadoVerifiedRequestIds.includes(requestId)) {
      return true;
    }

    const response = await this.checkVerificationOnchain(user.walletAddress);
    if (response) {
      user.privadoVerifiedRequestIds = [
        requestId,
        ...user.privadoVerifiedRequestIds,
      ];
      await user.save();
    }
    return response;
  }

  async isUserVerified(userId: number): Promise<boolean> {
    const user = await findUserById(userId);
    return (
      user?.privadoVerifiedRequestIds.includes(this.privadoRequestId()) || false
    );
  }
  privadoRequestId(): number {
    return PRIVADO_REQUEST_ID;
  }
}
