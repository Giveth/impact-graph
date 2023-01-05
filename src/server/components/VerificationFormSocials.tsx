import React from 'react';
import { withTheme } from 'styled-components';
import { Section, Label, Link } from '@adminjs/design-system';

const VerificationFormSocials = props => {
  const socials = props?.record?.params?.socials;

  return (
    <div>
      <Label>Project Socials</Label>
      <Section>
        {socials?.map(social => {
          const { link, name, socialNetworkId, isVerified, socialNetwork } =
            social;
          return (
            <div key={socialNetworkId}>
              <br />

              <h1>{socialNetwork}</h1>
              <br />
              <Section>
                <Label>Name</Label>
                {name || ''}
              </Section>
              <Section>
                <Label>Social network id</Label>
                {socialNetworkId}
              </Section>
              <Section>
                <Label>Verified</Label>
                <span className='sc-bdnylx efSokc admin-bro_Badge'>
                  {isVerified ? 'Yes' : 'No'}
                </span>
              </Section>
              <Section>
                <Label>Link</Label>
                <Link href={link || ''}>{link || ''}</Link>
              </Section>
            </div>
          );
        })}
      </Section>
      <br />
    </div>
  );
};

export default withTheme(VerificationFormSocials);
