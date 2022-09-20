import React from 'react';
import { withTheme } from 'styled-components';
import { Section, Label, Link } from '@admin-bro/design-system';

const VerificationFormProjectRegistry = props => {
  const isNonProfit =
    props?.record?.params?.['projectRegistry.isNonProfitOrganization'];
  const website =
    props?.record?.params?.['projectRegistry.organizationWebsite'] || '';
  const description =
    props?.record?.params?.['projectRegistry.organizationDescription'] || '';
  const name =
    props?.record?.params?.['projectRegistry.organizationName'] || '';
  const country =
    props?.record?.params?.['projectRegistry.organizationCountry'] || '';
  const attachments: any[] = [];
  Object.keys(props.record.params).forEach(key => {
    if (key.startsWith('projectRegistry.attachments.')) {
      attachments.push(props.record.params[key]);
    }
  });

  return (
    <div>
      <Label>Project Registry</Label>

      <Section>
        <Section>
          <Label>Project Registry Is Non Profit Organization</Label>
          <span>{isNonProfit ? 'Yes' : 'No'}</span>
        </Section>
        <Section>
          <Label>Organization Country</Label>
          {country}
        </Section>
        <Section>
          <Label>Organization Name</Label>
          {name}
        </Section>

        <Section>
          <Label>Organization Description</Label>
          {description}
        </Section>

        <Section>
          <Label>Organization Website</Label>
          {<Link href={website}>{website}</Link>}
        </Section>

        <Section>
          <Label>Attachments</Label>

          {attachments.map(attachment => {
            return (
              <div key={attachment}>
                {' '}
                <br />
                <Link href={attachment}>{attachment}</Link>
              </div>
            );
          })}
        </Section>
      </Section>
      <br />
    </div>
  );
};

export default withTheme(VerificationFormProjectRegistry);
