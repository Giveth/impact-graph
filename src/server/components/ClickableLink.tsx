import React from 'react';
import { withTheme } from 'styled-components';
import { Section, Label, Link } from '@admin-bro/design-system';

const ClickableLink = props => {
  const { record } = props;

  const link = record?.params?.projectUrl;

  if (!link) return null;

  return (
    <div>
      <Label>Project Link</Label>
      <Section>
        <Link href={link || ''} target="_blank">
          {link}
        </Link>
      </Section>
    </div>
  );
};

export default withTheme(ClickableLink);
