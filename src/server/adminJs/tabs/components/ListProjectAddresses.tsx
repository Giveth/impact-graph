import React from 'react';
import { withTheme } from 'styled-components';
import { Label, Section } from '@adminjs/design-system';
import { NETWORKS_IDS_TO_NAME } from '../../../../provider';

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
