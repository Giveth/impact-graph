import React from 'react';
import { withTheme } from 'styled-components';
import { Label, Section } from '@adminjs/design-system';

// when I import it from ./provider.ts I get an error through loading the page
const NETWORKS_IDS_TO_NAME = {
  1: 'MAIN_NET',
  3: 'ROPSTEN',
  11155111: 'SEPOLIA',
  100: 'GNOSIS',
  56: 'BSC',
  137: 'POLYGON',
  42220: 'CELO',
  44787: 'CELO_ALFAJORES',
  10: 'OPTIMISTIC',
  11155420: 'OPTIMISM_SEPOLIA',
  61: 'ETC',
  63: 'MORDOR_ETC_TESTNET',
  42161: 'ARBITRUM_MAINNET',
  421614: 'ARBITRUM_SEPOLIA',

  8453: 'BASE_MAINNET',
  84532: 'BASE_SEPOLIA',

  1101: 'ZKEVM_MAINNET',
  2442: 'ZKEVM_CARDONA',

  101: 'SOLANA_MAINNET',
  102: 'SOLANA_TESTNET',
  103: 'SOLANA_DEVNET',
};

const ListProjectAddresses = props => {
  const project = props.record.params;

  // Filter addresses from params format
  const projectKeys = Object.keys(project);
  const addressesCount = projectKeys.filter(
    key => key.includes('addresses') && key.includes('.address'),
  ).length;
  const projectAddresses: any = [];
  for (let i = 0; i < addressesCount; i++) {
    projectAddresses.push({
      address: project[`addresses.${i}.address`],
      network: project[`addresses.${i}.networkId`],
      isRecipient: project[`addresses.${i}.isRecipient`],
    });
  }

  return (
    <div>
      <Label>Addresses</Label>
      <Section>
        {projectAddresses.map(projectAddress => {
          return (
            <div key={projectAddress.id}>
              <Section>
                <Label>Address</Label>
                {projectAddress.address || ''}
              </Section>
              <Section>
                <Label>Network</Label>
                {NETWORKS_IDS_TO_NAME[projectAddress.network] || ''}
              </Section>
              <Section>
                <Label>This address is recipient for project</Label>
                <span className="sc-bdnylx efSokc admin-bro_Badge">
                  {projectAddress.isRecipient ? 'Yes' : 'No'}
                </span>
              </Section>
              <br />
            </div>
          );
        })}
      </Section>
    </div>
  );
};

export default withTheme(ListProjectAddresses);
