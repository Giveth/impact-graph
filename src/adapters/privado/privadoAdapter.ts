import { ethers } from 'ethers';
import config from '../../config';
import { getProvider } from '../../provider';
import { IPrivadoAdapter } from './privadoAdapterInterface';
const PRIVADO_VERIFIER_NETWORK_ID = +config.get(
  'PRIVADO_VERIFIER_NETWORK_ID',
) as number;
const PRIVADO_VERIFIER_CONTRACT_ADDRESS = config.get(
  'PRIVADO_VERIFIER_CONTRACT_ADDRESS',
) as string;
const PRIVADO_REQUEST_ID = +config.get('PRIVADO_REQUEST_ID') as number;
export class PrivadoAdapter implements IPrivadoAdapter {
  async isUserVerified(userAddress: string): Promise<boolean> {
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
    return await contract.isProofVerified(userAddress, PRIVADO_REQUEST_ID);
  }
}
